import { test, expect } from '../fixtures/auth.fixture';

test.describe('End-to-End Patient Journey', () => {
  test('should complete full patient journey from registration to queue completion', async ({ page, apiContext, authenticatedUser }) => {
    // Step 1: Register a new patient
    await page.goto('/patients/register');
    await expect(page.locator('h2')).toContainText('Patient Registration');

    const patientData = {
      first_name: 'E2ETest',
      last_name: 'Patient',
      dob: '1992-08-25',
      gender: 'female',
      phone: '555-1111',
      email: 'e2epatient@test.com',
      address: '999 E2E Street, Test City',
    };

    await page.locator('input[placeholder="First Name"]').fill(patientData.first_name);
    await page.locator('input[placeholder="Last Name"]').fill(patientData.last_name);
    await page.locator('input[type="date"]').fill(patientData.dob);
    await page.locator('select').first().selectOption(patientData.gender);
    await page.locator('input[type="tel"]').fill(patientData.phone);
    await page.locator('input[type="email"]').fill(patientData.email);
    await page.locator('textarea').fill(patientData.address);
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('p.message')).toContainText('Patient registered successfully');

    // Step 2: Create a doctor
    await page.goto('/doctors');
    await page.locator('button.btn-primary', { hasText: 'Add Doctor' }).click();

    const doctorData = {
      first_name: 'E2EDoctor',
      last_name: 'TestMD',
      specialty: 'General Practice',
      phone: '555-2222',
      email: 'e2edoctor@hospital.com',
      license: 'MD88888',
    };

    await page.locator('input[placeholder="First Name"]').fill(doctorData.first_name);
    await page.locator('input[placeholder="Last Name"]').fill(doctorData.last_name);
    await page.locator('input[placeholder="Specialty"]').fill(doctorData.specialty);
    await page.locator('input[placeholder="Phone"]').fill(doctorData.phone);
    await page.locator('input[placeholder="Email"]').fill(doctorData.email);
    await page.locator('input[placeholder="License Number"]').fill(doctorData.license);
    await page.locator('button[type="submit"]', { hasText: 'Add Doctor' }).click();

    // Verify doctor is created
    await expect(page.locator('.doctor-card', { hasText: doctorData.first_name })).toBeVisible();

    // Step 3: Get patient and doctor IDs from API
    const patientsResponse = await apiContext.get('/api/patients?search=E2ETest');
    const patientsData = await patientsResponse.json();
    const patientId = patientsData.patients[0]._id;

    const doctorsResponse = await apiContext.get('/api/doctors');
    const doctorsData = await doctorsResponse.json();
    const doctorId = doctorsData.doctors.find((d: any) => d.first_name === doctorData.first_name)._id;

    // Step 4: Book appointment
    await page.goto('/appointments/book');
    await page.locator('select').first().selectOption(patientId);
    await page.locator('select').nth(1).selectOption(doctorId);
    await page.locator('input[type="datetime-local"]').fill('2026-05-22T15:30');
    await page.locator('textarea').fill('Complete patient journey test appointment');
    await page.locator('button[type="submit"]').click();

    await expect(page.locator('p.message')).toContainText('Appointment booked successfully');

    // Step 5: Verify appointment in list
    await page.goto('/appointments');
    await expect(page.locator('.appointment-card').first()).toBeVisible();
    await expect(page.locator('.appointment-card').first()).toContainText('Status:');

    // Step 6: Add patient to queue
    await page.goto('/queue');
    await page.locator('button.btn-primary', { hasText: 'Add to Queue' }).click();
    await page.locator('select').first().selectOption(patientId);
    await page.locator('select').nth(1).selectOption(doctorId);
    await page.locator('select').nth(2).selectOption('normal');
    await page.locator('button[type="submit"]').click();

    // Verify patient is in queue
    const queueCard = page.locator('.queue-card').first();
    await expect(queueCard).toBeVisible();
    await expect(queueCard).toContainText('Token #');
    await expect(queueCard).toContainText('Status: waiting');

    // Step 7: Start consultation
    await queueCard.locator('button', { hasText: 'Start Consultation' }).click();
    await expect(page.locator('.queue-card', { hasText: 'Status: in_consultation' })).toBeVisible();

    // Step 8: Complete consultation
    const consultationCard = page.locator('.queue-card', { hasText: 'Status: in_consultation' }).first();
    await consultationCard.locator('button', { hasText: 'Complete' }).click();
    await expect(page.locator('.queue-card', { hasText: 'Status: completed' })).toBeVisible();

    // Step 9: Verify patient still exists in patient list
    await page.goto('/patients');
    await page.locator('input[type="search"]').fill(patientData.first_name);
    await page.waitForTimeout(500);
    await expect(page.locator('.patient-card', { hasText: patientData.first_name })).toBeVisible();
  });

  test('should handle multiple patients in queue with different priorities', async ({ page, apiContext }) => {
    // Create multiple patients
    const patients = [
      { first_name: 'Normal', last_name: 'Priority', phone: '555-3001', priority: 'normal' },
      { first_name: 'Senior', last_name: 'Citizen', phone: '555-3002', priority: 'senior_citizen' },
      { first_name: 'Emergency', last_name: 'Case', phone: '555-3003', priority: 'emergency' },
    ];

    const patientIds: string[] = [];

    for (const patient of patients) {
      const response = await apiContext.post('/api/patients', {
        data: {
          ...patient,
          date_of_birth: new Date('1980-01-01').toISOString(),
          gender: 'other',
          address: 'Test Address',
        },
      });
      const data = await response.json();
      patientIds.push(data.id);
    }

    // Add all patients to queue with different priorities
    for (let i = 0; i < patients.length; i++) {
      await apiContext.post('/api/queue', {
        data: {
          patient_id: patientIds[i],
          priority: patients[i].priority,
        },
      });
    }

    // Navigate to queue
    await page.goto('/queue');

    // Verify all three patients are in queue
    await expect(page.locator('.queue-card', { hasText: 'Priority: normal' })).toBeVisible();
    await expect(page.locator('.queue-card', { hasText: 'Priority: senior_citizen' })).toBeVisible();
    await expect(page.locator('.queue-card', { hasText: 'Priority: emergency' })).toBeVisible();

    // Verify emergency card has correct class
    const emergencyCard = page.locator('.queue-card.priority-emergency');
    await expect(emergencyCard).toBeVisible();
  });
});
