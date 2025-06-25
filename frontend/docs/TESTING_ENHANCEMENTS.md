# Testing Infrastructure Enhancements

## Overview

This document outlines the enhancements made to the BioThings testing infrastructure based on the omniscient-swarm analysis.

## New Features

### 1. Test Data Factories

Located in `__tests__/factories/`, these provide consistent test data generation:

- **Agent Factory**: Creates agent test data with various states
- **Workflow Factory**: Generates workflow objects with different statuses
- **Metrics Factory**: Produces system metrics for testing
- **Message Factory**: Creates WebSocket and agent messages

#### Usage Example:
```typescript
import { createAgent, createWorkflow, createMetrics } from '@/__tests__/factories';

const testAgent = createAgent({ status: 'active' });
const workflows = createWorkflowList(5);
const criticalMetrics = createCriticalMetrics();
```

### 2. Performance Testing Utilities

Located in `__tests__/utils/performance.ts`:

- **measureRender**: Measures component render time
- **PerformanceBudget**: Sets and validates performance budgets
- **detectMemoryLeaks**: Identifies potential memory leaks

#### Usage Example:
```typescript
import { measureRender, PerformanceBudget } from '@/__tests__/utils/performance';

it('should render within budget', async () => {
  const budget = new PerformanceBudget();
  budget.setBudget('Dashboard', 100);
  
  const metrics = await measureRender(<Dashboard />);
  budget.validate(metrics);
});
```

### 3. Accessibility Testing

Located in `__tests__/utils/accessibility.ts`:

- **checkAccessibility**: Runs accessibility checks
- **createKeyboardNavigationTest**: Tests keyboard navigation
- **getAccessibleName**: Retrieves accessible names
- **checkColorContrast**: Validates color contrast ratios

#### Usage Example:
```typescript
import { checkAccessibility, expectNoA11yViolations } from '@/__tests__/utils/accessibility';

it('should have no accessibility violations', async () => {
  const results = await checkAccessibility(<MyComponent />);
  expectNoA11yViolations(results);
});
```

### 4. WebSocket Testing Helpers

Located in `__tests__/utils/websocket.ts`:

- **WebSocketTestHelper**: Simplifies WebSocket testing
- **MockWebSocket**: Unit test WebSocket mock

#### Usage Example:
```typescript
import { WebSocketTestHelper } from '@/__tests__/utils/websocket';

it('should handle WebSocket messages', async () => {
  const ws = new WebSocketTestHelper();
  await ws.waitForConnection();
  await ws.sendMetricsUpdate(createMetrics());
  ws.cleanup();
});
```

### 5. Enhanced Test Utils

Updated `shared/test-utils/index.tsx`:

- **createTestQueryClient**: Configured QueryClient for tests
- **waitForLoadingToFinish**: Waits for all loading states
- **userEvent**: Integrated user interaction simulation

## Testing Strategy Roadmap

### Phase 1: Immediate (Week 1)
- [x] Fix ESM configuration issues
- [x] Create test data factories
- [x] Set up performance testing utilities
- [x] Create accessibility testing framework
- [ ] Achieve 80% test coverage for critical components

### Phase 2: Short-term (Week 2-3)
- [ ] Add visual regression testing with Chromatic
- [ ] Implement mutation testing with Stryker
- [ ] Create contract tests for API endpoints
- [ ] Add component screenshot tests

### Phase 3: Medium-term (Week 4-6)
- [ ] Set up E2E tests with Playwright
- [ ] Implement chaos testing for resilience
- [ ] Add load testing for WebSocket connections
- [ ] Create test reporting dashboard

### Phase 4: Long-term (Month 2+)
- [ ] Implement AI-powered test generation
- [ ] Add cross-browser testing matrix
- [ ] Create test maintenance automation
- [ ] Implement predictive test selection

## Best Practices

### 1. Use Factories for Test Data
```typescript
// ❌ Don't hardcode test data
const agent = { id: '123', name: 'Test', status: 'active' };

// ✅ Use factories
const agent = createAgent({ name: 'Test Agent' });
```

### 2. Test User Behavior, Not Implementation
```typescript
// ❌ Don't test implementation details
expect(component.state.isOpen).toBe(true);

// ✅ Test user-visible behavior
expect(screen.getByRole('dialog')).toBeVisible();
```

### 3. Use Semantic Queries
```typescript
// ❌ Avoid test IDs when possible
getByTestId('submit-button');

// ✅ Use semantic queries
getByRole('button', { name: 'Submit' });
```

### 4. Test Accessibility
```typescript
// Always include accessibility tests
it('should be accessible', async () => {
  const results = await checkAccessibility(<Component />);
  expectNoA11yViolations(results);
});
```

### 5. Monitor Performance
```typescript
// Set performance budgets
it('should render quickly', async () => {
  const metrics = await measureRender(<Component />);
  expect(metrics.renderTime).toBeLessThan(50);
});
```

## CI/CD Integration

### GitHub Actions Enhancements
- Parallel test execution across Node versions
- Coverage reporting with trend analysis
- Performance regression detection
- Accessibility violation blocking

### Pre-commit Hooks
```bash
# .husky/pre-commit
npm run test:unit -- --findRelatedTests
npm run lint
```

### Pre-push Hooks
```bash
# .husky/pre-push
npm run test:coverage -- --changedSince=main
```

## Metrics and Monitoring

### Key Metrics to Track
1. **Test Coverage**: Maintain >80% overall, >90% for critical paths
2. **Test Execution Time**: <2min for unit tests, <5min for integration
3. **Test Flakiness**: <1% flaky test rate
4. **Performance Budget**: Track render times across components

### Reporting
- Daily test execution reports
- Weekly coverage trends
- Monthly performance analysis
- Quarterly test health assessment

## Migration Guide

### For Existing Tests
1. Replace hardcoded test data with factories
2. Add performance assertions to critical components
3. Include accessibility checks in all UI tests
4. Update to use new test utilities

### For New Tests
1. Start with factories for all test data
2. Include performance and accessibility tests
3. Use semantic queries (getByRole, getByLabelText)
4. Follow the testing pyramid (unit > integration > E2E)

## Resources

- [Testing Library Best Practices](https://testing-library.com/docs/guiding-principles)
- [Jest Performance Testing](https://jestjs.io/docs/timer-mocks)
- [Web Accessibility Testing](https://www.w3.org/WAI/test-evaluate/)
- [Factory Pattern in Testing](https://thoughtbot.com/blog/factory-bot)