import { test, expect } from '../fixtures/auth.fixture';
import { createPatient, createDoctor, addToQueue } from '../utils/apiHelpers';
import { testPatient, testDoctor } from '../fixtures/testData';

test.describe('Queue Management', () => {
  test('should add patient to queue with normal priority', async ({ page, apiContext }) => {
    // Setup: Create patient and doctor
    const patientResult = await createPatient(apiContext, testPatient);
    const doctorResult = await createDoctor(apiContext, testDoctor);

    await page.goto('/queue');
    await expect(page.locator('h2')).toContainText('Queue Management');

    // Click Add to Queue
    await page.locator('button.btn-primary', { hasText: 'Add to Queue' }).click();
    await expect(page.locator('form.queue-form')).toBeVisible();

    // Select patient
    await page.locator('select').first().selectOption(patientResult.data.id);

    // Select doctor (optional)
    await page.locator('select').nth(1).selectOption(doctorResult.data.id);

    // Select priority (default is normal)
    await expect(page.locator('select').nth(2)).toHaveValue('normal');

    // Submit
    await page.locator('button[type="submit"]').click();

    // Verify queue card appears
    const queueCard = page.locator('.queue-card').first();
    await expect(queueCard).toBeVisible();
    await expect(queueCard).toContainText('Token #');
    await expect(queueCard).toContainText('Priority: normal');
    await expect(queueCard).toContainText('Status: waiting');
  });

  test('should add patient to queue without doctor', async ({ page, apiContext }) => {
    const patientResult = await createPatient(apiContext, {
      ...testPatient,
      first_name: 'QueueTest',
    });

    await page.goto('/queue');
    await page.locator('button.btn-primary', { hasText: 'Add to Queue' }).click();

    // Select patient only
    await page.locator('select').first().selectOption(patientResult.data.id);

    // Leave doctor unselected (optional field)
    await page.locator('button[type="submit"]').click();

    // Should still work
    await expect(page.locator('.queue-card').first()).toBeVisible();
  });

  test('should add patient with emergency priority', async ({ page, apiContext }) => {
    const patientResult = await createPatient(apiContext, {
      ...testPatient,
      first_name: 'Emergency',
    });

    await page.goto('/queue');
    await page.locator('button.btn-primary', { hasText: 'Add to Queue' }).click();

    await page.locator('select').first().selectOption(patientResult.data.id);
    await page.locator('select').nth(2).selectOption('emergency');

    await page.locator('button[type="submit"]').click();

    const queueCard = page.locator('.queue-card', { hasText: 'Priority: emergency' });
    await expect(queueCard).toBeVisible();
    await expect(queueCard).toHaveClass(/priority-emergency/);
  });

  test('should start consultation for waiting patient', async ({ page, apiContext }) => {
    // Setup: Create patient and add to queue
    const patientResult = await createPatient(apiContext, testPatient);
    const queueResult = await addToQueue(apiContext, patientResult.data.id);

    expect(queueResult.response.ok()).toBeTruthy();

    await page.goto('/queue');

    // Find queue card with waiting status
    const queueCard = page.locator('.queue-card', { hasText: 'Status: waiting' }).first();
    await expect(queueCard).toBeVisible();

    // Click Start Consultation
    await queueCard.locator('button', { hasText: 'Start Consultation' }).click();

    // Verify status changed
    await expect(page.locator('.queue-card', { hasText: 'Status: in_consultation' })).toBeVisible();
  });

  test('should complete consultation for patient in consultation', async ({ page, apiContext }) => {
    // Setup: Create patient and add to queue with in_consultation status
    const patientResult = await createPatient(apiContext, {
      ...testPatient,
      first_name: 'ConsultTest',
    });
    const queueResult = await addToQueue(apiContext, patientResult.data.id);

    // Update status to in_consultation
    await apiContext.put(`/api/queue/${queueResult.data.id}`, {
      data: { status: 'in_consultation' },
    });

    await page.goto('/queue');

    // Find queue card with in_consultation status
    const queueCard = page.locator('.queue-card', { hasText: 'Status: in_consultation' }).first();
    await expect(queueCard).toBeVisible();

    // Click Complete
    await queueCard.locator('button', { hasText: 'Complete' }).click();

    // Verify status changed to completed
    await expect(page.locator('.queue-card', { hasText: 'Status: completed' })).toBeVisible();
  });

  test('should display token number for queued patient', async ({ page, apiContext }) => {
    const patientResult = await createPatient(apiContext, testPatient);
    const queueResult = await addToQueue(apiContext, patientResult.data.id);

    await page.goto('/queue');

    const queueCard = page.locator('.queue-card').first();
    const tokenBadge = queueCard.locator('.token-badge');
    await expect(tokenBadge).toBeVisible();
    await expect(tokenBadge).toContainText('Token #');
  });

  test('should cancel adding to queue', async ({ page, apiContext }) => {
    await createPatient(apiContext, testPatient);

    await page.goto('/queue');
    await page.locator('button.btn-primary', { hasText: 'Add to Queue' }).click();
    await expect(page.locator('form.queue-form')).toBeVisible();

    // Click Cancel
    await page.locator('button.btn-primary', { hasText: 'Cancel' }).click();

    // Form should be hidden
    await expect(page.locator('form.queue-form')).not.toBeVisible();
  });

  test('should require patient selection for queue', async ({ page, authenticatedUser }) => {
    await page.goto('/queue');
    await page.locator('button.btn-primary', { hasText: 'Add to Queue' }).click();

    // Try to submit without selecting patient
    await page.locator('button[type="submit"]').click();

    // HTML5 validation should prevent submission
    const patientSelect = page.locator('select').first();
    const isInvalid = await patientSelect.evaluate((el: HTMLSelectElement) => !el.validity.valid);
    expect(isInvalid).toBeTruthy();
  });
});
