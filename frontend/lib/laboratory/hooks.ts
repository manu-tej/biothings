/**
 * Laboratory Custom Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useCallback, useMemo } from 'react'

import { apiClient } from '@/lib/api/client'
import { useWebSocket } from '@/lib/websocket/hooks'

import type { 
  Experiment, 
  Equipment, 
  SimulationRun,
  EquipmentFilters 
} from './types'

/**
 * Hook for managing experiments data
 */
export function useExperiments() {
  const queryClient = useQueryClient()
  
  const { data: experiments, isLoading } = useQuery({
    queryKey: ['experiments'],
    queryFn: () => apiClient.getExperiments(),
    refetchInterval: 300000, // 5 minutes
    staleTime: 300000
  })

  // WebSocket for real-time updates
  useWebSocket('experiment-updates', (update) => {
    queryClient.invalidateQueries({ queryKey: ['experiments'] })
  })

  const createExperiment = useMutation({
    mutationFn: (data: any) => apiClient.createExperiment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experiments'] })
    }
  })

  const updateExperimentStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => 
      apiClient.updateExperimentStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experiments'] })
    }
  })

  const activeExperiments = useMemo(() => 
    experiments?.filter((e: Experiment) => e.status === 'in_progress') || [],
    [experiments]
  )

  const completedExperiments = useMemo(() =>
    experiments?.filter((e: Experiment) => e.status === 'completed') || [],
    [experiments]
  )

  return {
    experiments: experiments || [],
    activeExperiments,
    completedExperiments,
    isLoading,
    createExperiment,
    updateExperimentStatus
  }
}

/**
 * Hook for managing equipment data with filtering
 */
export function useEquipment() {
  const queryClient = useQueryClient()
  const [filters, setFilters] = useState<EquipmentFilters>({
    type: 'all',
    status: 'all',
    search: ''
  })

  const { data: equipment, isLoading } = useQuery({
    queryKey: ['equipment'],
    queryFn: () => apiClient.getEquipment(),
    refetchInterval: 300000,
    staleTime: 300000
  })

  // WebSocket for real-time equipment status
  useWebSocket('equipment-status', (update) => {
    queryClient.setQueryData(['equipment'], (old: Equipment[] | undefined) => {
      if (!old) return old
      return old.map(eq => 
        eq.id === update.equipment_id 
          ? { ...eq, ...update.data }
          : eq
      )
    })
  })

  const filteredEquipment = useMemo(() => {
    if (!equipment) return []
    
    return equipment.filter((eq: Equipment) => {
      const matchesType = filters.type === 'all' || eq.type === filters.type
      const matchesStatus = filters.status === 'all' || eq.status === filters.status
      const matchesSearch = !filters.search || 
        eq.name.toLowerCase().includes(filters.search.toLowerCase())
      
      return matchesType && matchesStatus && matchesSearch
    })
  }, [equipment, filters])

  const updateFilters = useCallback((newFilters: Partial<EquipmentFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }, [])

  const availableEquipment = useMemo(() =>
    equipment?.filter((eq: Equipment) => eq.status === 'available') || [],
    [equipment]
  )

  const equipmentInUse = useMemo(() =>
    equipment?.filter((eq: Equipment) => eq.status === 'in_use') || [],
    [equipment]
  )

  return {
    equipment: equipment || [],
    filteredEquipment,
    availableEquipment,
    equipmentInUse,
    filters,
    updateFilters,
    isLoading
  }
}

/**
 * Hook for analysis results
 */
export function useAnalysisResults(experimentId?: string) {
  const { data: results, isLoading } = useQuery({
    queryKey: ['analysis-results', experimentId],
    queryFn: () => apiClient.getAnalysisResults(experimentId),
    enabled: !!experimentId,
    refetchInterval: 60000 // 1 minute for active analysis
  })

  return {
    results: results || [],
    isLoading
  }
}

/**
 * Hook for simulation management
 */
export function useSimulations() {
  const queryClient = useQueryClient()
  const [selectedSimulation, setSelectedSimulation] = useState<SimulationRun | null>(null)

  const { data: simulations, isLoading } = useQuery({
    queryKey: ['simulations'],
    queryFn: () => apiClient.getSimulations(),
    refetchInterval: 30000 // 30 seconds for active simulations
  })

  // WebSocket for simulation progress
  useWebSocket('simulation-progress', (update) => {
    queryClient.setQueryData(['simulations'], (old: SimulationRun[] | undefined) => {
      if (!old) return old
      return old.map(sim => 
        sim.id === update.simulation_id 
          ? { ...sim, progress: update.progress, status: update.status }
          : sim
      )
    })
  })

  const runSimulation = useMutation({
    mutationFn: (params: any) => apiClient.runSimulation(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['simulations'] })
    }
  })

  const activeSimulations = useMemo(() =>
    simulations?.filter((s: SimulationRun) => s.status === 'running') || [],
    [simulations]
  )

  return {
    simulations: simulations || [],
    activeSimulations,
    selectedSimulation,
    setSelectedSimulation,
    runSimulation,
    isLoading
  }
}