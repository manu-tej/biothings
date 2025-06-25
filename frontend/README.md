# BioThings Frontend

## Overview

Modern React-based frontend for the BioThings AI Platform, built with Next.js 15, TypeScript, and Tailwind CSS.

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

## Architecture

### Directory Structure

```
frontend/
├── app/                    # Next.js app directory
│   ├── dashboard/         # Main dashboard
│   ├── agents/           # Agent management
│   ├── workflows/        # Workflow monitoring
│   ├── laboratory/       # Lab equipment control
│   ├── analytics/        # Analytics dashboard
│   └── performance/      # Performance monitoring
├── components/            # Reusable components
├── lib/                   # Utilities and services
│   ├── api/              # API client
│   ├── hooks/            # Custom React hooks
│   ├── stores/           # State management
│   └── websocket/        # WebSocket management
├── docs/                  # Documentation
└── __tests__/            # Test files
```

## API Client

### Usage

The frontend uses a unified API client for all backend communication:

```typescript
import { apiClient } from '@/lib/api/client'

// Fetch agents
const agents = await apiClient.getAgents()

// Chat with agent
const response = await apiClient.chatWithAgent('ceo_agent', 'Hello')
```

### Documentation

- [API Client Strategy](./docs/API_CLIENT_STRATEGY.md) - Architecture and migration guide
- [API Client Examples](./docs/API_CLIENT_EXAMPLES.md) - Comprehensive usage examples
- [Quick Reference](./docs/API_CLIENT_QUICK_REFERENCE.md) - Method reference card
- [Migration Checklist](./docs/API_MIGRATION_CHECKLIST.md) - Migration tracking

## Key Features

### 1. Real-time Updates

- WebSocket integration for live data
- Automatic reconnection
- Message queuing

### 2. Performance Optimization

- Request caching with ETags
- Request deduplication
- Lazy loading
- Code splitting

### 3. Type Safety

- Full TypeScript coverage
- Strict type checking
- Auto-generated types from API

### 4. Testing

- Unit tests with Jest
- Component tests with React Testing Library
- E2E tests with Playwright
- MSW for API mocking

## Development Guidelines

### Code Style

```typescript
// Use named exports for components
export function AgentCard({ agent }: { agent: Agent }) {
  return <div>...</div>
}

// Import types separately
import type { Agent } from '@/lib/api/client'

// Use absolute imports
import { apiClient } from '@/lib/api/client'
```

### Linting and Formatting

The project uses ESLint and Prettier for code quality and consistency.

#### Available Scripts

```bash
# Run ESLint
npm run lint

# Fix ESLint issues automatically
npm run lint:fix

# Run ESLint with strict mode (no warnings allowed)
npm run lint:strict

# Format code with Prettier
npm run format

# Check formatting without making changes
npm run format:check
```

#### ESLint Configuration

The project enforces the following rules:

- **no-console**: Warns on console usage (except warn/error)
- **no-unused-vars**: Errors on unused variables (with \_ prefix exception)
- **no-unused-imports**: Automatically removes unused imports
- **React Hooks rules**: Enforces correct hooks usage
- **Import order**: Enforces consistent import organization

#### Pre-commit Hooks

Husky is configured to run linting and formatting automatically before commits:

- ESLint fixes are applied automatically
- Prettier formats all staged files
- Commits are blocked if there are unfixable lint errors

To bypass pre-commit hooks in emergencies:

```bash
git commit --no-verify -m "Emergency fix"
```

### State Management

- Use Zustand for global state
- React Query for server state
- Local state for component-specific data

### Error Handling

```typescript
try {
  const data = await apiClient.getAgents()
} catch (error) {
  // Log to monitoring service
  console.error('Failed to fetch agents:', error)
  // Show user-friendly error
  toast.error('Unable to load agents')
}
```

## Testing

### Running Tests

```bash
# Unit tests
npm test

# With coverage
npm run test:coverage

# E2E tests
npm run test:e2e

# Watch mode
npm run test:watch
```

### Writing Tests

See [Testing Documentation](./TESTING.md) for detailed guidelines.

## Performance

### Monitoring

- Built-in performance monitoring
- Real-time metrics dashboard
- Client-side error tracking

### Optimization

- Image optimization with Next.js Image
- Font optimization
- Bundle size monitoring
- Lighthouse CI integration

## Deployment

### Environment Variables

```env
NEXT_PUBLIC_API_URL=https://api.biothings.ai
NEXT_PUBLIC_WS_URL=wss://ws.biothings.ai
NEXT_PUBLIC_ENABLE_ANALYTICS=true
```

### Build & Deploy

```bash
# Production build
npm run build

# Docker build
docker build -t biothings-frontend .

# Deploy to Vercel
vercel deploy
```

## Contributing

1. Check the [API Migration Checklist](./docs/API_MIGRATION_CHECKLIST.md)
2. Follow the [API Client Strategy](./docs/API_CLIENT_STRATEGY.md)
3. Use examples from [API Client Examples](./docs/API_CLIENT_EXAMPLES.md)
4. Run tests before submitting PR
5. Update documentation as needed

## Support

For questions about:

- API Client usage: See [documentation](./docs/)
- Component development: Check examples in `/components`
- Testing: See [TESTING.md](./TESTING.md)
- Architecture: Review [design docs](./docs/)

## License

Proprietary - BioThings AI Platform
