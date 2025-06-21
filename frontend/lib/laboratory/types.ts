/**
 * Laboratory Types and Interfaces
 */

export interface Experiment {
  id: string
  name: string
  status: 'planning' | 'in_progress' | 'completed' | 'failed'
  start_date: string
  end_date?: string
  progress: number
  assigned_agents: string[]
  parameters?: Record<string, any>
  results?: Record<string, any>
}

export interface Equipment {
  id: string
  name: string
  type: string
  status: 'available' | 'in_use' | 'maintenance'
  last_maintenance: string
  current_experiment?: string
  specifications?: Record<string, any>
}

export interface AnalysisResult {
  id: string
  experiment_id: string
  timestamp: string
  type: string
  data: any
  confidence?: number
  notes?: string
}

export interface SimulationRun {
  id: string
  name: string
  status: 'running' | 'completed' | 'failed'
  progress: number
  parameters: Record<string, any>
  start_time: string
  end_time?: string
  results?: any
}

export interface EquipmentFilters {
  type: string
  status: string
  search: string
}

export interface ExperimentFormData {
  name: string
  type: string
  description: string
  parameters: Record<string, any>
  agents: string[]
  equipment: string[]
}