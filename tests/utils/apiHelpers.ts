import { APIRequestContext } from '@playwright/test';

export async function createPatient(api: APIRequestContext, patientData: any) {
  const response = await api.post('/api/patients', { data: patientData });
  const data = await response.json();
  return { response, data };
}

export async function createDoctor(api: APIRequestContext, doctorData: any) {
  const response = await api.post('/api/doctors', { data: doctorData });
  const data = await response.json();
  return { response, data };
}

export async function createAppointment(
  api: APIRequestContext,
  patientId: string,
  doctorId: string,
  appointmentDate: string,
  notes?: string
) {
  const response = await api.post('/api/appointments', {
    data: {
      patient_id: patientId,
      doctor_id: doctorId,
      appointment_date: appointmentDate,
      notes: notes || '',
    },
  });
  const data = await response.json();
  return { response, data };
}

export async function addToQueue(
  api: APIRequestContext,
  patientId: string,
  doctorId?: string,
  priority: string = 'normal'
) {
  const response = await api.post('/api/queue', {
    data: {
      patient_id: patientId,
      doctor_id: doctorId || '',
      priority,
    },
  });
  const data = await response.json();
  return { response, data };
}

export async function updateQueueStatus(
  api: APIRequestContext,
  queueId: string,
  status: string
) {
  const response = await api.put(`/api/queue/${queueId}`, {
    data: { status },
  });
  const data = await response.json();
  return { response, data };
}

export async function listPatients(api: APIRequestContext, search?: string) {
  const params = search ? `?search=${search}` : '';
  const response = await api.get(`/api/patients${params}`);
  const data = await response.json();
  return { response, data };
}

export async function listDoctors(api: APIRequestContext, specialty?: string) {
  const params = specialty ? `?specialty=${specialty}` : '';
  const response = await api.get(`/api/doctors${params}`);
  const data = await response.json();
  return { response, data };
}
