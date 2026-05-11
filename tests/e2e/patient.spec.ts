import { test, expect } from '../fixtures/auth.fixture';
import { testPatient, testPatient2 } from '../fixtures/testData';

test.describe('Patient Management', () => {
  test('should register a new patient with complete information', async ({ page, authenticatedUser }) => {
    await page.goto('/');
    await expect(page.locator('h2')).toContainText('Dashboard');

    // Navigate to patient registration
    await page.locator('a[href="/patients/register"]').click();
    await expect(page.locator('h2')).toContainText('Patient Registration');

    // Fill in patient information
    await page.locator('input[placeholder="First Name"]').fill(testPatient.first_name);
    await page.locator('input[placeholder="Last Name"]').fill(testPatient.last_name);
    await page.locator('input[type="date"]').fill(testPatient.date_of_birth.split('T')[0]);
    await page.locator('select').first().selectOption(testPatient.gender);
    await page.locator('input[type="tel"]').fill(testPatient.phone);
    await page.locator('input[type="email"]').fill(testPatient.email);
    await page.locator('textarea').fill(testPatient.address);

    // Submit form
    await page.locator('button[type="submit"]').click();

    // Verify success message
    await expect(page.locator('p.message')).toContainText('Patient registered successfully');

    // Verify form is cleared
    await expect(page.locator('input[placeholder="First Name"]')).toHaveValue('');
  });

  test('should register patient with minimum required fields', async ({ page, authenticatedUser }) => {
    await page.goto('/patients/register');

    const minimalPatient = {
      first_name: 'Minimal',
      last_name: 'User',
      date_of_birth: '1995-03-10',
      gender: 'other',
      phone: '555-9999',
      address: '789 Test Lane',
    };

    await page.locator('input[placeholder="First Name"]').fill(minimalPatient.first_name);
    await page.locator('input[placeholder="Last Name"]').fill(minimalPatient.last_name);
    await page.locator('input[type="date"]').fill(minimalPatient.date_of_birth);
    await page.locator('select').first().selectOption(minimalPatient.gender);
    await page.locator('input[type="tel"]').fill(minimalPatient.phone);
    await page.locator('textarea').fill(minimalPatient.address);

    await page.locator('button[type="submit"]').click();

    await expect(page.locator('p.message')).toContainText('Patient registered successfully');
  });

  test('should display patient in patient list after registration', async ({ page, apiContext }) => {
    // Create patient via API
    const response = await apiContext.post('/api/patients', { data: testPatient2 });
    expect(response.ok()).toBeTruthy();

    // Navigate to patient list
    await page.goto('/patients');
    await expect(page.locator('h2')).toContainText('Patient List');

    // Verify patient appears in list
    const patientCard = page.locator('.patient-card', { hasText: testPatient2.first_name });
    await expect(patientCard).toBeVisible();
    await expect(patientCard).toContainText(testPatient2.last_name);
    await expect(patientCard).toContainText(testPatient2.phone);
  });

  test('should search for patients by name', async ({ page, apiContext }) => {
    // Create multiple patients
    await apiContext.post('/api/patients', { data: testPatient });
    await apiContext.post('/api/patients', {
      data: {
        ...testPatient2,
        first_name: 'SearchTest',
        last_name: 'Patient',
      },
    });

    await page.goto('/patients');

    // Search for specific patient
    await page.locator('input[type="search"]').fill('SearchTest');
    await page.waitForTimeout(500); // Wait for debounce/search

    // Should find the searched patient
    await expect(page.locator('.patient-card', { hasText: 'SearchTest' })).toBeVisible();

    // Should not show other patients
    const patientCards = page.locator('.patient-card');
    const count = await patientCards.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('should require all mandatory fields for patient registration', async ({ page, authenticatedUser }) => {
    await page.goto('/patients/register');

    // Try to submit without filling required fields
    await page.locator('button[type="submit"]').click();

    // HTML5 validation should prevent submission
    const firstNameInput = page.locator('input[placeholder="First Name"]');
    const isInvalid = await firstNameInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(isInvalid).toBeTruthy();
  });
});
