# Chart Components Analysis for Lazy Loading

## Summary

Based on the analysis of the BioThings frontend codebase, here are all the chart components found and their current lazy loading status:

## Chart Library Used

- **echarts** (version 5.5.1) - A powerful, interactive charting and data visualization library
- **echarts-for-react** (version 3.0.2) - React wrapper for echarts (installed but not currently used)

## Chart Components Found

### 1. Analytics Page Charts (/frontend/app/analytics/page.tsx)

**Status:** ❌ NOT LAZY LOADED - This is the biggest optimization opportunity
**Library:** echarts (direct usage)
**Charts:**

- Performance Trends Chart (Line chart)
- Cost Breakdown Chart (Pie chart)
- Daily Productivity Chart (Bar + Line combination)

**Impact:** HIGH - This page imports the entire echarts library directly at the top
**Code:** `import * as echarts from 'echarts'` (line 5)

### 2. System Metrics Component (/frontend/components/dashboard/SystemMetrics.tsx)

**Status:** ✅ ALREADY LAZY LOADED via dynamic import
**Library:** echarts (direct usage)
**Chart:** Real-time CPU and Memory usage line chart with area fill
**Impact:** MEDIUM - Already optimized in the main dashboard page

### 3. Workflow Status Component (/frontend/components/dashboard/WorkflowStatus.tsx)

**Status:** ✅ ALREADY LAZY LOADED via dynamic import
**Library:** No charts (only progress bars and status indicators)
**Impact:** N/A - No actual charts, but the component is already lazy loaded

## Components Already Using Dynamic Imports

### Main Dashboard Page (/frontend/app/page.tsx)

- SystemMetrics ✅ (contains echarts)
- AgentOverview ✅
- WorkflowStatus ✅
- RealtimeAlerts ✅

### Agents Page (/frontend/app/agents/page.tsx)

- AgentChat ✅ (no charts)

## Recommendations

### 1. **HIGH PRIORITY - Analytics Page**

The analytics page should be refactored to use dynamic imports for its chart components:

- Extract each chart into separate components
- Use Next.js dynamic imports with ssr: false
- Consider splitting echarts imports to only load needed modules

### 2. **Consider Chart Library Optimization**

- echarts is a large library (~1MB gzipped)
- Consider using echarts treeshaking imports instead of `import * as echarts`
- Example: `import { LineChart, PieChart } from 'echarts/charts'`

### 3. **Unused Library**

- echarts-for-react is installed but not used
- Consider removing it to reduce dependencies

### 4. **Future Chart Components**

- The "Hierarchy visualization" mentioned in agents page (line 189) should be lazy loaded when implemented
- Any future data visualization components should follow the lazy loading pattern

## Impact Analysis

### Current Bundle Impact

- **Analytics page**: Loads ~1MB of echarts on initial page load
- **Dashboard page**: Charts are already lazy loaded (good!)
- **Other pages**: No direct chart imports

### Potential Savings

- Lazy loading the analytics page charts could save ~1MB from initial bundle
- This would significantly improve:
  - Initial page load time
  - Time to Interactive (TTI)
  - First Contentful Paint (FCP)

## Implementation Priority

1. **Analytics Page** - Highest impact, easiest to implement
2. **echarts Import Optimization** - Use modular imports
3. **Remove unused dependencies** - echarts-for-react
4. **Document best practices** - For future chart implementations
