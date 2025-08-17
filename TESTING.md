# Testing Guide

This document provides comprehensive information about testing in the Weather Station project.

## Overview

The project implements a multi-layer testing strategy:
- **Unit Tests**: Test individual functions and components in isolation
- **Integration Tests**: Test API endpoints and service interactions
- **Component Tests**: Test React components with user interactions
- **End-to-End Tests**: Test complete user workflows (planned)

## Coverage Requirements

### Backend Coverage Targets
- **Global Minimum**: 80% lines, 80% statements, 80% functions, 70% branches
- **Services**: 85% lines, 85% statements, 85% functions, 75% branches
- **Routes**: 80% lines, 80% statements, 80% functions, 70% branches

### Frontend Coverage Targets
- **Global Minimum**: 80% lines, 80% statements, 75% functions, 70% branches
- **Components**: 85% lines, 85% statements, 80% functions, 75% branches
- **Services**: 90% lines, 90% statements, 85% functions, 80% branches

## Testing Stack

### Backend
- **Jest**: Test runner and assertion library
- **Supertest**: HTTP assertions for API testing
- **Mock Services**: InfluxDB, Redis, MQTT mocked for isolation

### Frontend
- **Jest**: Test runner and assertion library
- **React Testing Library**: Component testing utilities
- **@testing-library/user-event**: User interaction simulation
- **JSDOM**: DOM environment for testing

## Running Tests

### Backend Tests

```bash
cd backend

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run only unit tests
npm run test:unit

# Run only integration tests
npm run test:integration

# Run tests for CI (no watch, with coverage)
npm run test:ci
```

### Frontend Tests

```bash
cd frontend

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run only unit tests
npm run test:unit

# Run only component tests
npm run test:components

# Run only service tests
npm run test:services

# Run tests for CI (no watch, with coverage)
npm run test:ci

# Type checking
npm run type-check

# Linting
npm run lint
```

## Test Structure

### Backend Test Organization

```
backend/
├── tests/
│   ├── setup.js                 # Global test setup
│   ├── services/                # Unit tests for services
│   │   ├── alertService.test.js
│   │   ├── cacheService.test.js
│   │   └── mqttService.test.js
│   └── integration/             # Integration tests
│       └── api.test.js
├── jest.config.js               # Jest configuration
└── .nycrc.json                  # NYC coverage configuration
```

### Frontend Test Organization

```
frontend/
├── src/
│   ├── components/
│   │   └── __tests__/           # Component tests
│   │       ├── CurrentMeasurements.test.tsx
│   │       └── AlertsPanel.test.tsx
│   └── services/
│       └── __tests__/           # Service tests
│           └── weatherService.test.ts
├── jest.config.js               # Jest configuration
└── jest.setup.js                # Global test setup
```

## Writing Tests

### Backend Unit Test Example

```javascript
// tests/services/alertService.test.js
const alertService = require('../../src/services/alertService');
const { writeAlert } = require('../../src/config/influxdb');

jest.mock('../../src/config/influxdb');

describe('AlertService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should create alert for high temperature', async () => {
    const stationId = 'TEST_STATION_001';
    const weatherData = { temperature: 45 };

    await alertService.checkAlerts(stationId, weatherData);

    expect(writeAlert).toHaveBeenCalledWith(
      expect.objectContaining({
        station_id: stationId,
        alert_type: 'temperature',
        severity: 'HIGH'
      })
    );
  });
});
```

### Frontend Component Test Example

```typescript
// src/components/__tests__/CurrentMeasurements.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CurrentMeasurements from '../CurrentMeasurements';

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('CurrentMeasurements', () => {
  const mockData = {
    station_id: 'TEST_STATION_001',
    temperature: 25.5,
    humidity: 60,
    timestamp: '2024-01-01T12:00:00Z'
  };

  it('should display temperature data', () => {
    renderWithTheme(
      <CurrentMeasurements data={mockData} loading={false} />
    );

    expect(screen.getByText('25.5°C')).toBeInTheDocument();
    expect(screen.getByText('Temperatura')).toBeInTheDocument();
  });
});
```

### API Integration Test Example

```javascript
// tests/integration/api.test.js
const request = require('supertest');
const app = require('../../src/app');

describe('Weather API', () => {
  describe('GET /api/weather/data/:stationId/latest', () => {
    it('should return latest weather data', async () => {
      const response = await request(app)
        .get('/api/weather/data/TEST_STATION_001/latest')
        .expect(200);

      expect(response.body).toHaveProperty('station_id');
      expect(response.body).toHaveProperty('temperature');
      expect(response.body).toHaveProperty('timestamp');
    });
  });
});
```

## Mocking Strategy

### Backend Mocks
- **InfluxDB**: Mocked to avoid database dependencies
- **Redis**: Mocked for cache service tests
- **MQTT**: Mocked for message service tests
- **Logger**: Mocked to reduce test noise

### Frontend Mocks
- **Next.js Router**: Mocked for component navigation
- **Chart.js**: Mocked for chart component tests
- **Leaflet**: Mocked for map component tests
- **Socket.IO**: Mocked for real-time features
- **Fetch API**: Mocked for service layer tests

## CI/CD Integration

### GitHub Actions

Tests run automatically on:
- Pull requests to `main` and `develop` branches
- Pushes to `main` and `develop` branches
- Manual workflow dispatch

### Coverage Reporting

- Coverage reports uploaded to **Codecov**
- Coverage thresholds enforced in CI
- Failed coverage fails the build
- Coverage reports available as artifacts

### Test Matrix

Tests run on:
- **Node.js versions**: 18 (primary)
- **Operating Systems**: Ubuntu (primary), with cross-platform compatibility
- **Dependencies**: Latest stable versions

## Performance Testing

### Backend Performance
- API response time monitoring
- Database query performance
- Memory usage tracking
- Concurrent request handling

### Frontend Performance
- Component render performance
- Bundle size monitoring
- Core Web Vitals tracking
- Accessibility compliance

## Best Practices

### General
1. **Test Naming**: Use descriptive test names that explain the scenario
2. **Arrange-Act-Assert**: Structure tests clearly
3. **Test Isolation**: Each test should be independent
4. **Mock External Dependencies**: Keep tests fast and reliable

### Backend Specific
1. **Database Isolation**: Use test databases or mocks
2. **Environment Variables**: Use test-specific configurations
3. **Async Testing**: Properly handle promises and async operations
4. **Error Testing**: Test both success and failure scenarios

### Frontend Specific
1. **User-Centric Testing**: Test from user perspective
2. **Accessibility Testing**: Include ARIA labels and roles
3. **Responsive Testing**: Test different viewport sizes
4. **State Management**: Test component state changes

## Debugging Tests

### Backend
```bash
# Debug specific test
npm test -- --testNamePattern="alert creation"

# Run with verbose output
npm test -- --verbose

# Debug with Node.js debugger
node --inspect-brk node_modules/.bin/jest --runInBand
```

### Frontend
```bash
# Debug specific component
npm test -- --testPathPattern=CurrentMeasurements

# Run with verbose output
npm test -- --verbose

# Debug with browser tools
npm test -- --detectOpenHandles
```

## Coverage Reports

### Viewing Coverage
- **HTML Report**: `open coverage/lcov-report/index.html`
- **Terminal**: Coverage summary in test output
- **CI**: Coverage reports in GitHub Actions artifacts

### Coverage Metrics
- **Lines**: Percentage of executed code lines
- **Statements**: Percentage of executed statements
- **Functions**: Percentage of called functions
- **Branches**: Percentage of executed code branches

## Continuous Improvement

### Regular Tasks
1. **Review Coverage**: Weekly coverage report review
2. **Update Tests**: Keep tests updated with code changes
3. **Performance Monitoring**: Track test execution time
4. **Dependency Updates**: Keep testing dependencies current

### Quality Gates
- All tests must pass before merge
- Coverage thresholds must be met
- No console errors in tests
- Linting rules must pass

## Tools and Extensions

### Recommended VS Code Extensions
- **Jest**: Jest test runner integration
- **Test Explorer**: Visual test runner
- **Coverage Gutters**: Inline coverage display
- **ESLint**: Code quality enforcement

### Useful Commands
```bash
# Generate coverage report only
npm run test:coverage -- --collectCoverageFrom="src/services/*.js"

# Run tests matching pattern
npm test -- --testNamePattern="temperature"

# Run tests for specific file
npm test -- CurrentMeasurements.test.tsx

# Update snapshots
npm test -- --updateSnapshot
```

This testing strategy ensures high code quality, prevents regressions, and enables confident deployments.