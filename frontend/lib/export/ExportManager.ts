import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

import { JSONValue, StringRecord } from '../types/common.types'

export interface ExportData {
  type: 'agents' | 'workflows' | 'metrics' | 'reports' | 'custom'
  format: ExportFormat
  data: JSONValue
  metadata: ExportMetadata
}

export interface ExportMetadata {
  title: string
  description?: string
  timestamp: Date
  source: string
  version: string
  filters?: StringRecord<JSONValue>
  dateRange?: {
    start: Date
    end: Date
  }
}

export type ExportFormat = 'json' | 'csv' | 'pdf' | 'xlsx'

export interface ExportOptions {
  format: ExportFormat
  includeMetadata: boolean
  includeCharts: boolean
  dateRange?: {
    start: Date
    end: Date
  }
  filters?: StringRecord<JSONValue>
  customFields?: string[]
  filename?: string
}

export interface ScheduledExport {
  id: string
  name: string
  description?: string
  schedule: ExportSchedule
  options: ExportOptions
  dataQuery: ExportDataQuery
  enabled: boolean
  lastRun?: Date
  nextRun: Date
  createdAt: Date
}

export interface ExportSchedule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'custom'
  time: string // HH:MM format
  dayOfWeek?: number // 0-6, Sunday = 0
  dayOfMonth?: number // 1-31
  cronExpression?: string // For custom schedules
}

export interface ExportDataQuery {
  type: ExportData['type']
  source: string
  parameters: StringRecord<JSONValue>
}

export interface ImportResult {
  success: boolean
  message: string
  errors: string[]
  warnings: string[]
  imported: number
  skipped: number
  data?: JSONValue
}

export interface ImportValidationRule {
  field: string
  required: boolean
  type: 'string' | 'number' | 'date' | 'boolean' | 'array' | 'object'
  validator?: (value: unknown) => boolean
  transform?: (value: unknown) => unknown
}

export class ExportManager {
  private scheduledExports: Map<string, ScheduledExport> = new Map()
  private exportHistory: ExportData[] = []
  private readonly maxHistorySize = 100

  constructor() {
    this.loadFromStorage()
    this.initializeScheduler()
  }

  // Export functions
  public async exportToJSON(data: JSONValue, options: ExportOptions): Promise<Blob> {
    const exportData: ExportData = {
      type: 'custom',
      format: 'json',
      data: this.processDataForExport(data, options),
      metadata: this.createMetadata('JSON Export', options),
    }

    this.addToHistory(exportData)

    const jsonData = options.includeMetadata ? exportData : exportData.data

    return new Blob([JSON.stringify(jsonData, null, 2)], {
      type: 'application/json',
    })
  }

  public async exportToCSV(data: StringRecord<JSONValue>[], options: ExportOptions): Promise<Blob> {
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Data must be a non-empty array for CSV export')
    }

    const processedData = this.processDataForExport(data, options)
    const csvContent = this.convertToCSV(processedData)

    const exportData: ExportData = {
      type: 'custom',
      format: 'csv',
      data: processedData,
      metadata: this.createMetadata('CSV Export', options),
    }

    this.addToHistory(exportData)

    return new Blob([csvContent], {
      type: 'text/csv',
    })
  }

  public async exportToPDF(
    elementId: string,
    options: ExportOptions,
    customTitle?: string
  ): Promise<Blob> {
    const element = document.getElementById(elementId)
    if (!element) {
      throw new Error(`Element with ID "${elementId}" not found`)
    }

    try {
      // Capture the element as canvas
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
      })

      // Create PDF
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      })

      const imgWidth = 297 // A4 landscape width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      // Add title
      if (customTitle || options.filename) {
        pdf.setFontSize(16)
        pdf.text(customTitle || options.filename || 'Dashboard Export', 15, 15)
      }

      // Add image
      const yOffset = customTitle || options.filename ? 25 : 15
      pdf.addImage(
        canvas.toDataURL('image/png'),
        'PNG',
        15,
        yOffset,
        imgWidth - 30,
        Math.min(imgHeight, 180) // Limit height to fit page
      )

      // Add metadata if requested
      if (options.includeMetadata) {
        pdf.addPage()
        pdf.setFontSize(14)
        pdf.text('Export Metadata', 15, 15)
        pdf.setFontSize(10)

        const metadata = this.createMetadata('PDF Export', options)
        let yPos = 25

        pdf.text(`Generated: ${metadata.timestamp.toLocaleString()}`, 15, yPos)
        yPos += 5
        pdf.text(`Source: ${metadata.source}`, 15, yPos)
        yPos += 5
        pdf.text(`Version: ${metadata.version}`, 15, yPos)

        if (metadata.description) {
          yPos += 5
          pdf.text(`Description: ${metadata.description}`, 15, yPos)
        }
      }

      const pdfBlob = pdf.output('blob')

      const exportData: ExportData = {
        type: 'reports',
        format: 'pdf',
        data: { elementId, title: customTitle },
        metadata: this.createMetadata('PDF Export', options),
      }

      this.addToHistory(exportData)

      return pdfBlob
    } catch (error) {
      console.error('PDF export failed:', error)
      throw new Error('Failed to generate PDF export')
    }
  }

  // Import functions
  public async importFromJSON(
    file: File,
    validationRules?: ImportValidationRule[]
  ): Promise<ImportResult> {
    try {
      const content = await this.readFileContent(file)
      const data = JSON.parse(content)

      if (validationRules) {
        const validation = this.validateImportData(data, validationRules)
        if (!validation.success) {
          return validation
        }
      }

      return {
        success: true,
        message: 'JSON import completed successfully',
        errors: [],
        warnings: [],
        imported: Array.isArray(data) ? data.length : 1,
        skipped: 0,
        data,
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to import JSON file',
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: [],
        imported: 0,
        skipped: 0,
      }
    }
  }

  public async importFromCSV(
    file: File,
    validationRules?: ImportValidationRule[]
  ): Promise<ImportResult> {
    try {
      const content = await this.readFileContent(file)
      const data = this.parseCSV(content)

      if (validationRules) {
        const validation = this.validateImportData(data, validationRules)
        if (!validation.success) {
          return validation
        }
      }

      return {
        success: true,
        message: 'CSV import completed successfully',
        errors: [],
        warnings: [],
        imported: data.length,
        skipped: 0,
        data,
      }
    } catch (error) {
      return {
        success: false,
        message: 'Failed to import CSV file',
        errors: [error instanceof Error ? error.message : String(error)],
        warnings: [],
        imported: 0,
        skipped: 0,
      }
    }
  }

  // Scheduled exports
  public createScheduledExport(
    name: string,
    schedule: ExportSchedule,
    options: ExportOptions,
    dataQuery: ExportDataQuery,
    description?: string
  ): ScheduledExport {
    const scheduledExport: ScheduledExport = {
      id: this.generateId(),
      name,
      description,
      schedule,
      options,
      dataQuery,
      enabled: true,
      nextRun: this.calculateNextRun(schedule),
      createdAt: new Date(),
    }

    this.scheduledExports.set(scheduledExport.id, scheduledExport)
    this.saveToStorage()
    return scheduledExport
  }

  public getScheduledExports(): ScheduledExport[] {
    return Array.from(this.scheduledExports.values())
  }

  public updateScheduledExport(id: string, updates: Partial<ScheduledExport>): boolean {
    const scheduledExport = this.scheduledExports.get(id)
    if (!scheduledExport) return false

    const updated = { ...scheduledExport, ...updates }
    if (updates.schedule) {
      updated.nextRun = this.calculateNextRun(updates.schedule)
    }

    this.scheduledExports.set(id, updated)
    this.saveToStorage()
    return true
  }

  public deleteScheduledExport(id: string): boolean {
    const deleted = this.scheduledExports.delete(id)
    if (deleted) {
      this.saveToStorage()
    }
    return deleted
  }

  public toggleScheduledExport(id: string): boolean {
    const scheduledExport = this.scheduledExports.get(id)
    if (!scheduledExport) return false

    scheduledExport.enabled = !scheduledExport.enabled
    this.scheduledExports.set(id, scheduledExport)
    this.saveToStorage()
    return true
  }

  // Export history
  public getExportHistory(): ExportData[] {
    return [...this.exportHistory].sort(
      (a, b) => b.metadata.timestamp.getTime() - a.metadata.timestamp.getTime()
    )
  }

  public clearExportHistory(): void {
    this.exportHistory = []
    this.saveToStorage()
  }

  // Utility functions
  public generateFilename(type: string, format: ExportFormat): string {
    const timestamp = new Date().toISOString().split('T')[0]
    return `biothings-${type}-${timestamp}.${format}`
  }

  public downloadBlob(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Private helper methods
  private processDataForExport(data: JSONValue, options: ExportOptions): JSONValue {
    let processedData = data

    // Apply date range filter if specified
    if (options.dateRange && Array.isArray(data)) {
      processedData = data.filter((item) => {
        const itemDate = this.extractDateFromItem(item)
        return (
          itemDate && options.dateRange && itemDate >= options.dateRange.start && itemDate <= options.dateRange.end
        )
      })
    }

    // Apply custom field selection if specified
    if (options.customFields && Array.isArray(processedData)) {
      processedData = processedData.map((item) => {
        const filtered: StringRecord<JSONValue> = {}
        const customFields = options.customFields
        if (customFields) {
          customFields.forEach((field) => {
            if (item.hasOwnProperty(field)) {
              filtered[field] = item[field]
            }
          })
        }
        return filtered
      })
    }

    return processedData
  }

  private convertToCSV(data: StringRecord<JSONValue>[]): string {
    if (data.length === 0) return ''

    const headers = Object.keys(data[0])
    const csvRows = [headers.join(',')]

    for (const item of data) {
      const values = headers.map((header) => {
        const value = item[header]
        if (value === null || value === undefined) return ''

        // Escape values containing commas or quotes
        const stringValue = String(value)
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
          return `"${stringValue.replace(/"/g, '""')}"`
        }
        return stringValue
      })
      csvRows.push(values.join(','))
    }

    return csvRows.join('\n')
  }

  private parseCSV(content: string): StringRecord<JSONValue>[] {
    const lines = content.split('\n').filter((line) => line.trim())
    if (lines.length === 0) return []

    const headers = lines[0].split(',').map((header) => header.trim())
    const data = []

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map((value) => value.trim())
      const item: StringRecord<JSONValue> = {}

      headers.forEach((header, index) => {
        item[header] = values[index] || ''
      })

      data.push(item)
    }

    return data
  }

  private validateImportData(data: JSONValue, rules: ImportValidationRule[]): ImportResult {
    const errors: string[] = []
    const warnings: string[] = []
    let validItems = 0
    let skippedItems = 0

    const items = Array.isArray(data) ? data : [data]

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      let itemValid = true

      for (const rule of rules) {
        const value = item[rule.field]

        // Check required fields
        if (rule.required && (value === undefined || value === null || value === '')) {
          errors.push(`Row ${i + 1}: Required field '${rule.field}' is missing`)
          itemValid = false
          continue
        }

        // Skip validation for optional empty fields
        if (!rule.required && (value === undefined || value === null || value === '')) {
          continue
        }

        // Type validation
        if (!this.validateFieldType(value, rule.type)) {
          errors.push(
            `Row ${i + 1}: Field '${rule.field}' has invalid type (expected ${rule.type})`
          )
          itemValid = false
          continue
        }

        // Custom validation
        if (rule.validator && !rule.validator(value)) {
          errors.push(`Row ${i + 1}: Field '${rule.field}' failed custom validation`)
          itemValid = false
          continue
        }

        // Transform value if needed
        if (rule.transform) {
          try {
            item[rule.field] = rule.transform(value)
          } catch (error) {
            warnings.push(`Row ${i + 1}: Failed to transform field '${rule.field}'`)
          }
        }
      }

      if (itemValid) {
        validItems++
      } else {
        skippedItems++
      }
    }

    return {
      success: errors.length === 0,
      message:
        errors.length === 0
          ? `Validation successful: ${validItems} items valid`
          : `Validation failed: ${errors.length} errors found`,
      errors,
      warnings,
      imported: validItems,
      skipped: skippedItems,
      data: errors.length === 0 ? data : null,
    }
  }

  private validateFieldType(value: unknown, type: ImportValidationRule['type']): boolean {
    switch (type) {
      case 'string':
        return typeof value === 'string'
      case 'number':
        return typeof value === 'number' && !isNaN(value)
      case 'date':
        return value instanceof Date || !isNaN(Date.parse(value))
      case 'boolean':
        return typeof value === 'boolean' || value === 'true' || value === 'false'
      case 'array':
        return Array.isArray(value)
      case 'object':
        return typeof value === 'object' && value !== null && !Array.isArray(value)
      default:
        return true
    }
  }

  private createMetadata(title: string, options: ExportOptions): ExportMetadata {
    return {
      title,
      timestamp: new Date(),
      source: 'BioThings Dashboard',
      version: '1.0.0',
      filters: options.filters,
      dateRange: options.dateRange,
    }
  }

  private extractDateFromItem(item: StringRecord<JSONValue>): Date | null {
    // Try common date field names
    const dateFields = ['date', 'timestamp', 'createdAt', 'updatedAt', 'lastActivity']

    for (const field of dateFields) {
      if (item[field]) {
        const date = new Date(item[field])
        if (!isNaN(date.getTime())) {
          return date
        }
      }
    }

    return null
  }

  private readFileContent(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => resolve(e.target?.result as string)
      reader.onerror = (e) => reject(e)
      reader.readAsText(file)
    })
  }

  private addToHistory(exportData: ExportData): void {
    this.exportHistory.unshift(exportData)

    if (this.exportHistory.length > this.maxHistorySize) {
      this.exportHistory = this.exportHistory.slice(0, this.maxHistorySize)
    }

    this.saveToStorage()
  }

  private calculateNextRun(schedule: ExportSchedule): Date {
    const now = new Date()
    const nextRun = new Date(now)

    const [hours, minutes] = schedule.time.split(':').map(Number)
    nextRun.setHours(hours, minutes, 0, 0)

    switch (schedule.frequency) {
      case 'daily':
        if (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 1)
        }
        break

      case 'weekly':
        const targetDay = schedule.dayOfWeek || 0
        const currentDay = nextRun.getDay()
        let daysUntilTarget = targetDay - currentDay

        if (daysUntilTarget < 0 || (daysUntilTarget === 0 && nextRun <= now)) {
          daysUntilTarget += 7
        }

        nextRun.setDate(nextRun.getDate() + daysUntilTarget)
        break

      case 'monthly':
        const targetDate = schedule.dayOfMonth || 1
        nextRun.setDate(targetDate)

        if (nextRun <= now) {
          nextRun.setMonth(nextRun.getMonth() + 1)
        }
        break

      case 'custom':
        // For custom schedules, we'd need a cron parser
        // For now, default to daily
        if (nextRun <= now) {
          nextRun.setDate(nextRun.getDate() + 1)
        }
        break
    }

    return nextRun
  }

  private initializeScheduler(): void {
    // Check for due scheduled exports every minute
    setInterval(() => {
      this.checkScheduledExports()
    }, 60000)
  }

  private async checkScheduledExports(): Promise<void> {
    const now = new Date()

    for (const scheduledExport of Array.from(this.scheduledExports.values())) {
      if (scheduledExport.enabled && scheduledExport.nextRun <= now) {
        try {
          await this.executeScheduledExport(scheduledExport)

          // Update next run time
          scheduledExport.lastRun = now
          scheduledExport.nextRun = this.calculateNextRun(scheduledExport.schedule)
          this.scheduledExports.set(scheduledExport.id, scheduledExport)
          this.saveToStorage()
        } catch (error) {
          console.error(`Failed to execute scheduled export ${scheduledExport.id}:`, error)
        }
      }
    }
  }

  private async executeScheduledExport(_scheduledExport: ScheduledExport): Promise<void> {
    // This would need to be implemented based on the specific data sources
    // For now, just log the execution
    // TODO: Implement scheduled export execution for ${scheduledExport.name}

    // Example implementation would fetch data based on dataQuery
    // and then export it using the specified options
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2)
  }

  // Storage management
  private saveToStorage(): void {
    try {
      const data = {
        scheduledExports: Array.from(this.scheduledExports.entries()),
        exportHistory: this.exportHistory,
      }
      localStorage.setItem('biothings-export-data', JSON.stringify(data, this.dateReplacer))
    } catch (error) {
      console.error('Failed to save export data:', error)
    }
  }

  private loadFromStorage(): void {
    try {
      const data = localStorage.getItem('biothings-export-data')
      if (data) {
        const parsed = JSON.parse(data, this.dateReviver)
        if (parsed.scheduledExports) {
          this.scheduledExports = new Map(parsed.scheduledExports)
        }
        if (parsed.exportHistory) {
          this.exportHistory = parsed.exportHistory
        }
      }
    } catch (error) {
      console.error('Failed to load export data:', error)
    }
  }

  private dateReplacer(key: string, value: unknown): unknown {
    if (value instanceof Date) {
      return { __type: 'Date', value: value.toISOString() }
    }
    return value
  }

  private dateReviver(key: string, value: unknown): unknown {
    if (value && typeof value === 'object' && value.__type === 'Date') {
      return new Date(value.value)
    }
    return value
  }
}

// Global export manager instance
export const exportManager = new ExportManager()
