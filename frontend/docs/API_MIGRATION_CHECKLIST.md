# API Client Migration Checklist

## Phase 1: Documentation & Setup (Complete ✅)

- [x] Analyze all API client implementations
- [x] Create API Client Strategy document
- [x] Add deprecation warnings to legacy files
- [x] Add runtime console warnings

## Phase 2: Component Migration

### High Priority Components

#### Dashboard Components

- [ ] `/components/dashboard/SystemMetrics.tsx`
- [ ] `/components/dashboard/WorkflowStatus.tsx`
- [ ] `/components/dashboard/RealtimeAlerts.tsx`

#### Agent Components

- [ ] `/components/agents/AgentChat.tsx`
- [ ] `/app/agents/page.tsx`

#### Workflow Components

- [ ] `/app/workflows/page.tsx`
- [ ] `/app/workflows/page-with-virtual-scroll.tsx`
- [ ] `/app/workflows/optimized-page.tsx`
- [ ] `/components/workflows/QuickActionModal.tsx`
- [ ] `/components/workflows/NewWorkflowModal.tsx`

#### Laboratory Components

- [ ] `/app/laboratory/page.tsx`
- [ ] `/lib/laboratory/hooks.ts`

#### Other Pages

- [ ] `/app/analytics/page.tsx`
- [ ] `/app/performance/page.tsx`

### Test Files

- [ ] `/__tests__/unit/components/dashboard/SystemMetrics.test.tsx`
- [ ] `/__tests__/unit/components/dashboard/SystemMetrics.enhanced.test.tsx`
- [ ] `/__tests__/unit/components/dashboard/WorkflowStatus.test.tsx`
- [ ] `/__tests__/unit/lib/api/client.test.ts`

## Phase 3: Batch Client Integration

- [ ] Analyze if backend supports `/api/batch` endpoint
- [ ] Decide on batch client integration strategy
- [ ] Either:
  - [ ] Integrate batch functionality into unified client
  - [ ] Keep batch client separate but document usage
- [ ] Update batch-hooks.ts to use unified client where possible

## Phase 4: Cleanup

- [ ] Remove `/lib/api-client.ts`
- [ ] Remove `/lib/api-client-export.ts`
- [ ] Remove `/lib/optimized-api-client.ts`
- [ ] Remove `/lib/api.ts`
- [ ] Update all import statements
- [ ] Update documentation
- [ ] Remove deprecation warnings

## Migration Progress

| Component            | Status         | Notes               |
| -------------------- | -------------- | ------------------- |
| API Strategy Doc     | ✅ Complete    |                     |
| Deprecation Warnings | ✅ Complete    |                     |
| Runtime Warnings     | ✅ Complete    |                     |
| Component Migration  | 🔄 In Progress | 0/19 files migrated |
| Test Migration       | ⏳ Pending     |                     |
| Batch Integration    | ⏳ Pending     |                     |
| Cleanup              | ⏳ Pending     |                     |

## Notes

- All components already use `@/lib/api/client` - no migration needed for imports
- Focus should be on:
  1. Documenting the unified approach
  2. Integrating batch functionality if needed
  3. Removing redundant files

## Next Steps

1. Review existing component usage
2. Test batch endpoint availability
3. Create examples for common patterns
4. Update team documentation
