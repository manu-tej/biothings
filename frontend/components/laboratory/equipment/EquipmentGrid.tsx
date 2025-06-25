'use client'

import { Wrench, Calendar } from 'lucide-react'
import React from 'react'

import { equipmentTypeIcons, statusColors } from '@/lib/laboratory/constants'
import type { Equipment } from '@/lib/laboratory/types'

interface EquipmentCardProps {
  equipment: Equipment
}

const EquipmentCard = React.memo(({ equipment }: EquipmentCardProps) => {
  const lastMaintenance = React.useMemo(() => {
    const date = new Date(equipment.last_maintenance)
    const days = Math.floor((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24))
    return `${days} days ago`
  }, [equipment.last_maintenance])

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
            {equipmentTypeIcons[equipment.type] || <Wrench className="w-5 h-5" />}
          </div>
          <div>
            <h4 className="font-medium text-gray-900 dark:text-white">
              {equipment.name}
            </h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">
              {equipment.type.replace('_', ' ')}
            </p>
          </div>
        </div>
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColors[equipment.status]}`}>
          {equipment.status.replace('_', ' ')}
        </span>
      </div>
      
      <div className="space-y-1 text-sm">
        <div className="flex items-center text-gray-600 dark:text-gray-400">
          <Calendar className="w-3 h-3 mr-1" />
          <span>Last maintenance: {lastMaintenance}</span>
        </div>
        {equipment.current_experiment && (
          <p className="text-gray-600 dark:text-gray-400">
            In use by: {equipment.current_experiment}
          </p>
        )}
      </div>
    </div>
  )
}, (prevProps, nextProps) => {
  return prevProps.equipment.id === nextProps.equipment.id &&
         prevProps.equipment.status === nextProps.equipment.status &&
         prevProps.equipment.current_experiment === nextProps.equipment.current_experiment
})

interface EquipmentGridProps {
  equipment: Equipment[]
  loading?: boolean
}

export function EquipmentGrid({ equipment, loading }: EquipmentGridProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="animate-pulse bg-gray-200 dark:bg-gray-700 h-32 rounded-lg" />
        ))}
      </div>
    )
  }

  if (equipment.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <Wrench className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No equipment found</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {equipment.map(eq => (
        <EquipmentCard key={eq.id} equipment={eq} />
      ))}
    </div>
  )
}