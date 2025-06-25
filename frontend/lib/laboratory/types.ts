/**
 * Laboratory Types and Interfaces
 */

import { JSONValue, StringRecord } from '../types/common.types'

export interface Experiment {
  id: string
  name: string
  status: 'planning' | 'in_progress' | 'completed' | 'failed'
  start_date: string
  end_date?: string
  progress: number
  assigned_agents: string[]
  parameters?: StringRecord<JSONValue>
  results?: StringRecord<JSONValue>
}

export interface Equipment {
  id: string
  name: string
  type: string
  status: 'available' | 'in_use' | 'maintenance'
  last_maintenance: string
  current_experiment?: string
  specifications?: StringRecord<JSONValue>
}

export interface AnalysisResult {
  id: string
  experiment_id: string
  timestamp: string
  type: string
  data: JSONValue
  confidence?: number
  notes?: string
}

export interface SimulationRun {
  id: string
  name: string
  status: 'running' | 'completed' | 'failed'
  progress: number
  parameters: Record<string, unknown>
  start_time: string
  end_time?: string
  results?: JSONValue
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
  parameters: Record<string, unknown>
  agents: string[]
  equipment: string[]
}
