import { test, expect } from '../fixtures/auth.fixture';
import { testDoctor, testDoctor2 } from '../fixtures/testData';

test.describe('Doctor Management', () => {
  test('should create a new doctor profile', async ({ page, authenticatedUser }) => {
    await page.goto('/doctors');
    await expect(page.locator('h2')).toContainText('Doctor Management');

    // Click Add Doctor button
    await page.locator('button.btn-primary', { hasText: 'Add Doctor' }).click();

    // Verify form is visible
    await expect(page.locator('form.doctor-form')).toBeVisible();

    // Fill in doctor information
    await page.locator('input[placeholder="First Name"]').fill(testDoctor.first_name);
    await page.locator('input[placeholder="Last Name"]').fill(testDoctor.last_name);
    await page.locator('input[placeholder="Specialty"]').fill(testDoctor.specialty);
    await page.locator('input[placeholder="Phone"]').fill(testDoctor.phone);
    await page.locator('input[placeholder="Email"]').fill(testDoctor.email);
    await page.locator('input[placeholder="License Number"]').fill(testDoctor.license_number);

    // Submit form
    await page.locator('button[type="submit"]', { hasText: 'Add Doctor' }).click();

    // Verify form is hidden after submission
    await expect(page.locator('form.doctor-form')).not.toBeVisible();

    // Verify doctor appears in the list
    const doctorCard = page.locator('.doctor-card', { hasText: testDoctor.first_name });
    await expect(doctorCard).toBeVisible();
    await expect(doctorCard).toContainText(`Dr. ${testDoctor.first_name} ${testDoctor.last_name}`);
    await expect(doctorCard).toContainText(testDoctor.specialty);
    await expect(doctorCard).toContainText(testDoctor.phone);
    await expect(doctorCard).toContainText(testDoctor.email);
  });

  test('should display multiple doctors in the list', async ({ page, apiContext }) => {
    // Create doctors via API
    await apiContext.post('/api/doctors', { data: testDoctor });
    await apiContext.post('/api/doctors', { data: testDoctor2 });

    await page.goto('/doctors');

    // Verify both doctors are displayed
    await expect(page.locator('.doctor-card', { hasText: testDoctor.first_name })).toBeVisible();
    await expect(page.locator('.doctor-card', { hasText: testDoctor2.first_name })).toBeVisible();

    // Verify doctor count
    const doctorCards = page.locator('.doctor-card');
    const count = await doctorCards.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('should cancel doctor creation form', async ({ page, authenticatedUser }) => {
    await page.goto('/doctors');

    // Open form
    await page.locator('button.btn-primary', { hasText: 'Add Doctor' }).click();
    await expect(page.locator('form.doctor-form')).toBeVisible();

    // Click Cancel
    await page.locator('button.btn-primary', { hasText: 'Cancel' }).click();

    // Verify form is hidden
    await expect(page.locator('form.doctor-form')).not.toBeVisible();
  });

  test('should require all mandatory fields for doctor creation', async ({ page, authenticatedUser }) => {
    await page.goto('/doctors');
    await page.locator('button.btn-primary', { hasText: 'Add Doctor' }).click();

    // Try to submit without filling required fields
    await page.locator('button[type="submit"]', { hasText: 'Add Doctor' }).click();

    // HTML5 validation should prevent submission
    const firstNameInput = page.locator('input[placeholder="First Name"]');
    const isInvalid = await firstNameInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(isInvalid).toBeTruthy();
  });

  test('should display doctor specialty correctly', async ({ page, apiContext }) => {
    const specialtyDoctor = {
      ...testDoctor,
      first_name: 'Specialty',
      last_name: 'Test',
      specialty: 'Neurology',
      email: 'specialty.test@hospital.com',
      license_number: 'MD99999',
    };

    await apiContext.post('/api/doctors', { data: specialtyDoctor });
    await page.goto('/doctors');

    const doctorCard = page.locator('.doctor-card', { hasText: specialtyDoctor.specialty });
    await expect(doctorCard).toBeVisible();
    await expect(doctorCard.locator('.specialty')).toContainText(specialtyDoctor.specialty);
  });
});
