import { test, expect } from '../fixtures/auth.fixture';
import { createPatient, createDoctor } from '../utils/apiHelpers';
import { testPatient, testDoctor } from '../fixtures/testData';

test.describe('Appointment Management', () => {
  test('should book appointment for patient with doctor', async ({ page, apiContext }) => {
    // Setup: Create patient and doctor
    const patientResult = await createPatient(apiContext, testPatient);
    const doctorResult = await createDoctor(apiContext, testDoctor);

    expect(patientResult.response.ok()).toBeTruthy();
    expect(doctorResult.response.ok()).toBeTruthy();

    const patientId = patientResult.data.id;
    const doctorId = doctorResult.data.id;

    // Navigate to appointment booking
    await page.goto('/appointments/book');
    await expect(page.locator('h2')).toContainText('Book Appointment');

    // Select patient
    await page.locator('select').first().selectOption(patientId);

    // Select doctor
    await page.locator('select').nth(1).selectOption(doctorId);

    // Set appointment date/time
    const appointmentDateTime = '2026-05-15T10:00';
    await page.locator('input[type="datetime-local"]').fill(appointmentDateTime);

    // Add notes
    await page.locator('textarea').fill('Regular checkup appointment');

    // Submit booking
    await page.locator('button[type="submit"]').click();

    // Verify success message
    await expect(page.locator('p.message')).toContainText('Appointment booked successfully');

    // Verify form is cleared
    await expect(page.locator('select').first()).toHaveValue('');
  });

  test('should display booked appointment in appointments list', async ({ page, apiContext }) => {
    // Setup: Create patient, doctor, and appointment
    const patientResult = await createPatient(apiContext, {
      ...testPatient,
      first_name: 'AppointmentTest',
    });
    const doctorResult = await createDoctor(apiContext, {
      ...testDoctor,
      email: 'appt.doctor@hospital.com',
      license_number: 'MD55555',
    });

    const appointmentDate = new Date('2026-05-16T14:00:00').toISOString();
    await apiContext.post('/api/appointments', {
      data: {
        patient_id: patientResult.data.id,
        doctor_id: doctorResult.data.id,
        appointment_date: appointmentDate,
        notes: 'Test appointment',
      },
    });

    // Navigate to appointments list
    await page.goto('/appointments');
    await expect(page.locator('h2')).toContainText('Appointments');

    // Verify appointment card is displayed
    const appointmentCard = page.locator('.appointment-card').first();
    await expect(appointmentCard).toBeVisible();
    await expect(appointmentCard).toContainText('Appointment #');
    await expect(appointmentCard).toContainText('Status:');
  });

  test('should cancel an appointment', async ({ page, apiContext }) => {
    // Setup: Create appointment
    const patientResult = await createPatient(apiContext, testPatient);
    const doctorResult = await createDoctor(apiContext, {
      ...testDoctor,
      email: 'cancel.doctor@hospital.com',
      license_number: 'MD66666',
    });

    const appointmentResponse = await apiContext.post('/api/appointments', {
      data: {
        patient_id: patientResult.data.id,
        doctor_id: doctorResult.data.id,
        appointment_date: new Date('2026-05-20T09:00:00').toISOString(),
        notes: 'To be cancelled',
      },
    });

    expect(appointmentResponse.ok()).toBeTruthy();

    await page.goto('/appointments');

    // Find and cancel appointment
    const appointmentCard = page.locator('.appointment-card').first();
    await appointmentCard.locator('button.btn-secondary', { hasText: 'Cancel' }).click();

    // Verify status changed to cancelled
    await expect(appointmentCard.locator('.status-cancelled')).toBeVisible();

    // Verify cancel button is no longer visible for cancelled appointment
    await expect(appointmentCard.locator('button.btn-secondary', { hasText: 'Cancel' })).not.toBeVisible();
  });

  test('should require patient and doctor selection for booking', async ({ page, authenticatedUser }) => {
    await page.goto('/appointments/book');

    // Try to submit without selections
    await page.locator('button[type="submit"]').click();

    // HTML5 validation should prevent submission
    const patientSelect = page.locator('select').first();
    const isInvalid = await patientSelect.evaluate((el: HTMLSelectElement) => !el.validity.valid);
    expect(isInvalid).toBeTruthy();
  });

  test('should show patient and doctor options in dropdowns', async ({ page, apiContext }) => {
    // Create patient and doctor
    await createPatient(apiContext, testPatient);
    await createDoctor(apiContext, testDoctor);

    await page.goto('/appointments/book');

    // Check patient dropdown has options
    const patientOptions = page.locator('select').first().locator('option');
    const patientCount = await patientOptions.count();
    expect(patientCount).toBeGreaterThan(1); // More than just placeholder

    // Check doctor dropdown has options
    const doctorOptions = page.locator('select').nth(1).locator('option');
    const doctorCount = await doctorOptions.count();
    expect(doctorCount).toBeGreaterThan(1); // More than just placeholder
  });
});
