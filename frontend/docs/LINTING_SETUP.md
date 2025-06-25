# Linting and Formatting Configuration

## Overview

This document describes the linting and formatting setup for the BioThings frontend project.

## Configuration Files

### ESLint Configuration (.eslintrc.js)

The project uses ESLint with the following key rules:

1. **Console Usage**
   - `no-console`: Warns on console usage (except warn/error)

2. **Unused Code Detection**
   - `no-unused-vars`: Errors on unused variables (with _ prefix exception)
   - `unused-imports/no-unused-imports`: Automatically removes unused imports

3. **React Hooks**
   - `react-hooks/rules-of-hooks`: Enforces correct hooks usage
   - `react-hooks/exhaustive-deps`: Warns about missing dependencies

4. **Import Organization**
   - `import/order`: Enforces consistent import organization with grouping

5. **TypeScript Rules**
   - `@typescript-eslint/no-explicit-any`: Warns about any usage
   - `@typescript-eslint/no-unused-vars`: TypeScript-aware unused variable detection

### Prettier Configuration (.prettierrc)

Formatting rules include:
- No semicolons
- Single quotes
- 2-space indentation
- Trailing commas (ES5)
- 100-character line width
- LF line endings

### Ignored Files

Both ESLint and Prettier ignore:
- node_modules/
- .next/
- build/dist directories
- Environment files
- Generated files

## Available Scripts

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

## Pre-commit Hooks

Husky is configured to run linting and formatting automatically before commits:

1. ESLint fixes are applied automatically
2. Prettier formats all staged files
3. Commits are blocked if there are unfixable lint errors

Location: `/.husky/pre-commit`

To bypass pre-commit hooks in emergencies:
```bash
git commit --no-verify -m "Emergency fix"
```

## Dependencies

### Dev Dependencies
- `eslint`: Core linting engine
- `eslint-config-next`: Next.js ESLint configuration
- `@typescript-eslint/eslint-plugin`: TypeScript linting rules
- `@typescript-eslint/parser`: TypeScript parser for ESLint
- `eslint-plugin-import`: Import/export linting
- `eslint-plugin-unused-imports`: Unused import detection
- `prettier`: Code formatter
- `husky`: Git hooks
- `lint-staged`: Run linters on staged files

## Integration with Development Workflow

1. **VS Code Integration**
   - Install ESLint extension
   - Install Prettier extension
   - Enable format on save

2. **CI/CD Integration**
   - Run `npm run lint:strict` in CI pipeline
   - Run `npm run format:check` to verify formatting

3. **Pre-commit Workflow**
   - Automatic fixing of fixable issues
   - Prevents commits with lint errors
   - Ensures consistent code style

## Common Issues and Solutions

### Issue: Import order errors
**Solution**: Run `npm run lint:fix` to automatically reorder imports

### Issue: Unused variables/imports
**Solution**: 
- Prefix unused parameters with underscore: `_unusedParam`
- Run `npm run lint:fix` to remove unused imports

### Issue: Console statements
**Solution**: Use console.warn() or console.error() for necessary logging

### Issue: TypeScript any usage
**Solution**: Define proper types or use `unknown` if type is truly unknown

## Best Practices

1. Run `npm run lint:fix` before committing
2. Configure your editor to run ESLint/Prettier on save
3. Review warnings even if they don't block commits
4. Use TypeScript types instead of `any`
5. Keep imports organized and remove unused ones

## Future Enhancements

- Consider adding more strict TypeScript rules
- Add accessibility linting rules
- Configure complexity metrics
- Add performance linting rules