from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Optional
from app.models import PrescriptionCreate, Prescription, UserRole
from app.database import PrescriptionDB, PatientDB, DoctorDB, VisitHistoryDB
from app.auth import get_current_user, require_role

router = APIRouter(prefix="/api/prescriptions", tags=["Prescriptions"])


@router.post("/", response_model=Prescription, status_code=status.HTTP_201_CREATED)
async def create_prescription(
    prescription_data: PrescriptionCreate,
    current_user: dict = Depends(require_role([UserRole.DOCTOR]))
):
    patient = PatientDB.get_by_id(prescription_data.patient_id)
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )

    visit = VisitHistoryDB.get_by_id(prescription_data.visit_id)
    if not visit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Visit record not found"
        )

    created_prescription = PrescriptionDB.create(prescription_data.model_dump())
    return Prescription(**created_prescription)


@router.get("/", response_model=List[Prescription])
async def get_prescriptions(
    patient_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    if patient_id:
        if current_user["role"] == UserRole.PATIENT.value:
            patient = PatientDB.get_by_user_id(current_user["sub"])
            if not patient or patient["id"] != patient_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only view your own prescriptions"
                )

        prescriptions = PrescriptionDB.get_by_patient(patient_id)
        return [Prescription(**p) for p in prescriptions]

    if current_user["role"] == UserRole.PATIENT.value:
        patient = PatientDB.get_by_user_id(current_user["sub"])
        if patient:
            prescriptions = PrescriptionDB.get_by_patient(patient["id"])
            return [Prescription(**p) for p in prescriptions]

    return []


@router.get("/{visit_id}", response_model=Prescription)
async def get_prescription_by_visit(
    visit_id: str,
    current_user: dict = Depends(get_current_user)
):
    prescription = PrescriptionDB.get_by_visit(visit_id)
    if not prescription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prescription not found"
        )
    return Prescription(**prescription)
