# Hospital Management System - E2E Test Suite

This directory contains end-to-end tests for the Hospital Appointment Management System using Playwright.

## Setup

1. Install dependencies:
```bash
cd tests
npm install
```

2. Install Playwright browsers:
```bash
npx playwright install
```

## Running Tests

- Run all tests: `npm test`
- Run tests in headed mode: `npm run test:headed`
- Run tests with UI: `npm run test:ui`
- Debug tests: `npm run test:debug`

## Test Structure

- **e2e/**: End-to-end test files
  - `auth.spec.ts`: Authentication and login flows
  - `patient.spec.ts`: Patient registration and management
  - `doctor.spec.ts`: Doctor creation and management
  - `appointment.spec.ts`: Appointment booking and cancellation
  - `queue.spec.ts`: Queue management and workflow
  - `e2e-patient-journey.spec.ts`: Complete patient journey tests

- **fixtures/**: Shared test fixtures
  - `auth.fixture.ts`: Authentication setup and helpers
  - `testData.ts`: Test data constants

- **utils/**: Helper functions
  - `apiHelpers.ts`: API interaction helpers

## Configuration

Test configuration is in `playwright.config.ts`. Key settings:
- Base URL: `http://localhost:5173` (configurable via `FRONTEND_URL` env var)
- Single worker to avoid database conflicts
- Automatic retries on CI

## Prerequisites

Before running tests, ensure:
1. Backend server is running on configured port
2. Frontend dev server is running on port 5173
3. MongoDB is accessible and configured
4. `.env` file is properly configured with required variables

## Test Coverage

The test suite covers:
- User authentication (registration, login, logout)
- Patient registration with required and optional fields
- Patient search and listing
- Doctor profile creation and management
- Appointment booking and cancellation
- Queue management with different priorities
- Complete patient journey from registration to consultation completion
- Role-based access control
- Form validation
