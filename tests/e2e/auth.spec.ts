import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login page with correct elements', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Hospital Management System');
    await expect(page.locator('p.subtitle')).toContainText('Please login to continue');
    await expect(page.locator('input[type="text"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toContainText('Login');
  });

  test('should successfully register and login with valid credentials', async ({ page, baseURL }) => {
    const username = `testuser_${Date.now()}`;
    const password = 'testpass123';

    // Register user via API
    const registerResponse = await page.request.post(`${baseURL}/api/auth/register`, {
      data: {
        username,
        email: `${username}@test.com`,
        password,
        role: 'receptionist',
      },
    });
    expect(registerResponse.ok()).toBeTruthy();

    // Login via UI
    await page.locator('input[type="text"]').fill(username);
    await page.locator('input[type="password"]').fill(password);
    await page.locator('button[type="submit"]').click();

    // Verify successful login - should see dashboard
    await expect(page.locator('h2')).toContainText('Dashboard');
    await expect(page.locator('.user-info')).toContainText(username);
    await expect(page.locator('.user-info')).toContainText('receptionist');
  });

  test('should show error message for invalid credentials', async ({ page }) => {
    await page.locator('input[type="text"]').fill('invaliduser');
    await page.locator('input[type="password"]').fill('wrongpassword');
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('p.error')).toBeVisible();
    await expect(page.locator('p.error')).toContainText('Invalid credentials');
  });

  test('should require username and password fields', async ({ page }) => {
    // Try to submit without filling fields
    const submitButton = page.locator('button[type="submit"]');
    await submitButton.click();

    // HTML5 validation should prevent submission
    const usernameInput = page.locator('input[type="text"]');
    const isInvalid = await usernameInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(isInvalid).toBeTruthy();
  });

  test('should logout successfully', async ({ page, baseURL }) => {
    const username = `testuser_${Date.now()}`;
    const password = 'testpass123';

    // Register and login
    await page.request.post(`${baseURL}/api/auth/register`, {
      data: {
        username,
        email: `${username}@test.com`,
        password,
        role: 'admin',
      },
    });

    await page.locator('input[type="text"]').fill(username);
    await page.locator('input[type="password"]').fill(password);
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('h2')).toContainText('Dashboard');

    // Logout
    await page.locator('button.btn-logout').click();

    // Should be back at login page
    await expect(page.locator('h1')).toContainText('Hospital Management System');
    await expect(page.locator('p.subtitle')).toContainText('Please login to continue');
  });
});
