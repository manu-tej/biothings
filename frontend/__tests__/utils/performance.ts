import { ReactElement } from 'react'
import { render, RenderResult } from '@testing-library/react'
import { performance } from 'perf_hooks'

export interface PerformanceMetrics {
  renderTime: number
  componentName: string
  timestamp: number
}

export async function measureRender(
  component: ReactElement,
  options: { iterations?: number } = {}
): Promise<PerformanceMetrics> {
  const { iterations = 10 } = options
  const componentName = component.type.name || 'Unknown'

  let totalTime = 0
  let renderResult: RenderResult | null = null

  for (let i = 0; i < iterations; i++) {
    const start = performance.now()

    if (renderResult) {
      renderResult.unmount()
    }

    renderResult = render(component)

    const end = performance.now()
    totalTime += end - start
  }

  if (renderResult) {
    renderResult.unmount()
  }

  return {
    renderTime: totalTime / iterations,
    componentName,
    timestamp: Date.now(),
  }
}

export function expectPerformanceWithin(metrics: PerformanceMetrics, maxTime: number) {
  expect(metrics.renderTime).toBeLessThan(maxTime)
}

export class PerformanceBudget {
  private budgets: Map<string, number> = new Map()

  setBudget(componentName: string, maxRenderTime: number) {
    this.budgets.set(componentName, maxRenderTime)
  }

  validate(metrics: PerformanceMetrics) {
    const budget = this.budgets.get(metrics.componentName)
    if (budget && metrics.renderTime > budget) {
      throw new Error(
        `Component ${metrics.componentName} exceeded performance budget: ` +
          `${metrics.renderTime.toFixed(2)}ms > ${budget}ms`
      )
    }
  }

  getReport(): string {
    const report: string[] = ['Performance Budget Report']
    report.push('========================')

    this.budgets.forEach((budget, component) => {
      report.push(`${component}: ${budget}ms`)
    })

    return report.join('\n')
  }
}

// Memory leak detection utility
export async function detectMemoryLeaks(
  testFn: () => Promise<void>,
  options: { threshold?: number; iterations?: number } = {}
): Promise<boolean> {
  const { threshold = 1.1, iterations = 5 } = options

  if (!global.gc) {
    console.warn('Memory leak detection requires --expose-gc flag')
    return false
  }

  const initialMemory = process.memoryUsage().heapUsed

  for (let i = 0; i < iterations; i++) {
    await testFn()
    global.gc()
  }

  const finalMemory = process.memoryUsage().heapUsed
  const memoryRatio = finalMemory / initialMemory

  return memoryRatio <= threshold
}
