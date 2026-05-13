from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Optional
from app.models import (
    AppointmentCreate, AppointmentUpdate, Appointment,
    AppointmentStatus, UserRole
)
from app.database import AppointmentDB, PatientDB, DoctorDB, DoctorScheduleDB
from app.auth import get_current_user, require_role

router = APIRouter(prefix="/api/appointments", tags=["Appointments"])


@router.post("/", response_model=Appointment, status_code=status.HTTP_201_CREATED)
async def create_appointment(
    appointment_data: AppointmentCreate,
    current_user: dict = Depends(get_current_user)
):
    patient = PatientDB.get_by_id(appointment_data.patient_id)
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )

    doctor = DoctorDB.get_by_id(appointment_data.doctor_id)
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor not found"
        )

    if not AppointmentDB.check_slot_available(
        appointment_data.doctor_id,
        appointment_data.appointment_date,
        appointment_data.appointment_time
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This time slot is not available"
        )

    available_slots = DoctorScheduleDB.get_available_slots(
        appointment_data.doctor_id,
        appointment_data.appointment_date
    )
    if appointment_data.appointment_time not in available_slots:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This time slot is blocked or not available"
        )

    created_appointment = AppointmentDB.create(appointment_data.model_dump())
    return Appointment(**created_appointment)


@router.get("/", response_model=List[Appointment])
async def get_appointments(
    patient_id: Optional[str] = Query(None),
    doctor_id: Optional[str] = Query(None),
    date: Optional[str] = Query(None),
    status: Optional[AppointmentStatus] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    appointments = []

    if patient_id:
        appointments = AppointmentDB.get_by_patient(patient_id)
    elif doctor_id:
        appointments = AppointmentDB.get_by_doctor(doctor_id, date)
    elif current_user["role"] == UserRole.PATIENT.value:
        patient = PatientDB.get_by_user_id(current_user["sub"])
        if patient:
            appointments = AppointmentDB.get_by_patient(patient["id"])
    elif current_user["role"] == UserRole.DOCTOR.value:
        doctor = DoctorDB.get_by_user_id(current_user["sub"])
        if doctor:
            appointments = AppointmentDB.get_by_doctor(doctor["id"], date)

    if status:
        appointments = [a for a in appointments if a.get("status") == status.value]

    return [Appointment(**a) for a in appointments]


@router.get("/{appointment_id}", response_model=Appointment)
async def get_appointment(
    appointment_id: str,
    current_user: dict = Depends(get_current_user)
):
    appointment = AppointmentDB.get_by_id(appointment_id)
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found"
        )
    return Appointment(**appointment)


@router.put("/{appointment_id}", response_model=Appointment)
async def update_appointment(
    appointment_id: str,
    appointment_data: AppointmentUpdate,
    current_user: dict = Depends(get_current_user)
):
    appointment = AppointmentDB.get_by_id(appointment_id)
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found"
        )

    if appointment_data.appointment_date and appointment_data.appointment_time:
        if not AppointmentDB.check_slot_available(
            appointment["doctor_id"],
            appointment_data.appointment_date,
            appointment_data.appointment_time
        ):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This time slot is not available"
            )
        appointment_data.status = AppointmentStatus.RESCHEDULED

    update_dict = {k: v for k, v in appointment_data.model_dump().items() if v is not None}
    updated_appointment = AppointmentDB.update(appointment_id, update_dict)
    return Appointment(**updated_appointment)


@router.delete("/{appointment_id}")
async def cancel_appointment(
    appointment_id: str,
    current_user: dict = Depends(get_current_user)
):
    appointment = AppointmentDB.get_by_id(appointment_id)
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Appointment not found"
        )

    AppointmentDB.update(appointment_id, {"status": AppointmentStatus.CANCELLED.value})
    return {"message": "Appointment cancelled successfully"}
