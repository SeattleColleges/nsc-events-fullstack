# E2E Tests with Playwright

This directory contains end-to-end tests using Playwright for the NSC Events fullstack application.

## Overview

The E2E tests cover critical user journeys across both frontend (Next.js) and backend (NestJS) applications:

- **Authentication** - Sign up, login, logout, password reset
- **Event Management** - Create, read, update, archive events
- **Event Registration** - Register for events, view registrations, cancel registration
- **User Management** - Profile management, role-based access, admin functions
- **Accessibility** - Keyboard navigation, semantic HTML, focus indicators

## Project Structure

```
e2e/
├── tests/                    # Test files
│   ├── auth.spec.ts         # Authentication tests
│   ├── event-management.spec.ts  # Event CRUD tests
│   ├── event-registration.spec.ts # Registration workflows
│   ├── user-management.spec.ts    # User and admin functions
│   └── accessibility.spec.ts      # A11y tests
├── fixtures/                 # Playwright fixtures
│   └── auth.ts              # Authentication fixture with setup
├── utils/                    # Utility functions
│   ├── api-client.ts        # API client for test data setup
│   ├── global-setup.ts      # Global setup (e.g., API readiness)
│   └── global-teardown.ts   # Global cleanup
├── data/                     # Test data generators
│   └── test-data.ts         # Test user and event generators
└── .env.example             # Environment variables template
```

## Getting Started

### Prerequisites

- Node.js 20.x or higher
- Both backend and frontend services running locally

### Installation

Playwright is already installed as a dev dependency at the root level:

```bash
npm install
```

### Environment Variables

Create a `.env` file in the `e2e/` directory (copy from `.env.example`):

```bash
cp e2e/.env.example e2e/.env
```

Update values if your services run on different ports:

```env
PLAYWRIGHT_BASE_URL=http://localhost:8080
PLAYWRIGHT_API_URL=http://localhost:3000
```

## Running Tests

### Development Mode

Start both services in separate terminals:

```bash
# Terminal 1 - Backend
npm run dev:backend

# Terminal 2 - Frontend
npm run dev:frontend

# Terminal 3 - Run tests
npm run test:e2e
```

### Run All E2E Tests

```bash
npm run test:e2e
```

### Run Specific Test File

```bash
npm run test:e2e -- e2e/tests/auth.spec.ts
```

### Run Tests in Specific Browser

```bash
npm run test:e2e -- --project=chromium
npm run test:e2e -- --project=firefox
npm run test:e2e -- --project=webkit
```

### Run with Playwright UI

```bash
npm run test:e2e:ui
```

This opens the interactive Playwright Inspector where you can:
- See test steps visually
- Debug step by step
- Record new tests
- View DOM snapshots

### Run in Debug Mode

```bash
npm run test:e2e:debug
```

This enables inspector and pauses at breakpoints.

### Run Single Test

```bash
npm run test:e2e -- --grep "should login with valid credentials"
```

## Test Reports

After tests complete, view the HTML report:

```bash
npx playwright show-report
```

Reports are saved in `playwright-report/` directory.

## Writing New Tests

### Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    // Arrange
    await page.goto('/page');
    
    // Act
    await page.click('button');
    
    // Assert
    await expect(page).toHaveURL('/new-page');
  });
});
```

### Using Fixtures

```typescript
import { test, expect } from '../fixtures/auth';

test('should create event while authenticated', async ({ authenticatedPage }) => {
  const { page, apiClient, user } = authenticatedPage;
  
  await page.goto('/create-event');
  // ... test steps
});
```

### Using Test Data

```typescript
import { generateTestUser, generateEventData } from '../data/test-data';

test('should create event', async ({ page }) => {
  const eventData = generateEventData();
  const user = generateTestUser();
  
  // ... test steps
});
```

### Best Practices

1. **Isolation** - Each test should be independent
2. **Cleanup** - Tests clean up after themselves (use beforeAll/afterAll)
3. **Selectors** - Use semantic selectors (role, text) instead of CSS classes
4. **API Setup** - Use API calls for test data, not UI interactions
5. **Waits** - Use implicit waits (waitForURL, waitForLoadState) instead of sleep
6. **Assertions** - Verify user-visible behavior, not implementation details

## CI/CD Integration

Tests run automatically in GitHub Actions on:

- Pull requests (if E2E changes detected)
- Pushes to main branch
- Manual workflow dispatch

The workflow:
1. Starts both services
2. Waits for services to be ready
3. Runs all E2E tests
4. Archives HTML reports as artifacts
5. Stores videos/screenshots for failed tests

## Troubleshooting

### Tests Won't Start

Check services are running:
```bash
curl http://localhost:3000/  # Backend
curl http://localhost:8080/  # Frontend
```

### Authentication Failing

- Verify API endpoints match actual backend routes
- Check test user creation is working (review API responses)
- Ensure authentication tokens are set correctly

### Timeouts

- Increase timeout in `playwright.config.ts` (default: 30s)
- Check if services are slow to respond
- Review network activity in test reports

### Selector Issues

- Use Playwright Inspector to find elements:
  ```bash
  npx playwright codegen http://localhost:8080
  ```
- Inspect element in browser DevTools
- Use more specific selectors (role attributes, text content)

## Performance Tips

1. **Parallel Execution** - Tests run in parallel by default
2. **Shared Services** - Both services start once, tests reuse them
3. **Test Data** - Use API setup instead of UI for faster test data creation
4. **Selectors** - Use specific selectors to avoid searching large DOM

## Contributing

When adding new tests:

1. Create test file in `e2e/tests/`
2. Follow existing test patterns
3. Use `test.describe()` for grouping
4. Document complex test scenarios
5. Run tests locally before pushing
6. Update this README if adding new features

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging](https://playwright.dev/docs/debug)
- [CI/CD Integration](https://playwright.dev/docs/ci)

## Support

For issues or questions:
- Check test reports in `playwright-report/`
- Review test logs in console output
- Use Playwright Inspector for debugging
- See CONTRIBUTING.md for development guidelines
