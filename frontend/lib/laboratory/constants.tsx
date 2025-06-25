/**
 * Laboratory Constants
 */

import { Beaker, BarChart3, Brain, Microscope, TestTube, Dna, Pill, Heart } from 'lucide-react'
import React from 'react'

export const experimentTypeIcons: Record<string, React.ReactNode> = {
  drug_discovery: <Pill className="w-5 h-5" />,
  protein_analysis: <Dna className="w-5 h-5" />,
  cell_culture: <Microscope className="w-5 h-5" />,
  clinical_trial: <Heart className="w-5 h-5" />,
  synthesis: <TestTube className="w-5 h-5" />,
}

export const equipmentTypeIcons: Record<string, React.ReactNode> = {
  microscope: <Microscope className="w-5 h-5" />,
  sequencer: <Dna className="w-5 h-5" />,
  spectrometer: <BarChart3 className="w-5 h-5" />,
  bioreactor: <Beaker className="w-5 h-5" />,
  analyzer: <Brain className="w-5 h-5" />,
}

export const statusColors = {
  // Experiment status colors
  planning: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400',
  in_progress: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',

  // Equipment status colors
  available: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
  in_use: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400',
  maintenance: 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400',
}

export const experimentTypes = [
  { value: 'drug_discovery', label: 'Drug Discovery' },
  { value: 'protein_analysis', label: 'Protein Analysis' },
  { value: 'cell_culture', label: 'Cell Culture' },
  { value: 'clinical_trial', label: 'Clinical Trial' },
  { value: 'synthesis', label: 'Chemical Synthesis' },
]

export const equipmentTypes = [
  { value: 'all', label: 'All Equipment' },
  { value: 'microscope', label: 'Microscopes' },
  { value: 'sequencer', label: 'Sequencers' },
  { value: 'spectrometer', label: 'Spectrometers' },
  { value: 'bioreactor', label: 'Bioreactors' },
  { value: 'analyzer', label: 'Analyzers' },
]

export const equipmentStatuses = [
  { value: 'all', label: 'All Status' },
  { value: 'available', label: 'Available' },
  { value: 'in_use', label: 'In Use' },
  { value: 'maintenance', label: 'Maintenance' },
]
