from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Optional
from app.models import VisitHistoryCreate, VisitHistory, UserRole
from app.database import VisitHistoryDB, PatientDB, DoctorDB
from app.auth import get_current_user, require_role

router = APIRouter(prefix="/api/visits", tags=["Visit History"])


@router.post("/", response_model=VisitHistory, status_code=status.HTTP_201_CREATED)
async def create_visit_record(
    visit_data: VisitHistoryCreate,
    current_user: dict = Depends(require_role([UserRole.DOCTOR]))
):
    patient = PatientDB.get_by_id(visit_data.patient_id)
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )

    doctor = DoctorDB.get_by_id(visit_data.doctor_id)
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor not found"
        )

    created_visit = VisitHistoryDB.create(visit_data.model_dump())
    return VisitHistory(**created_visit)


@router.get("/", response_model=List[VisitHistory])
async def get_visit_history(
    patient_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    if patient_id:
        if current_user["role"] == UserRole.PATIENT.value:
            patient = PatientDB.get_by_user_id(current_user["sub"])
            if not patient or patient["id"] != patient_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="You can only view your own visit history"
                )

        visits = VisitHistoryDB.get_by_patient(patient_id)
        return [VisitHistory(**v) for v in visits]

    if current_user["role"] == UserRole.PATIENT.value:
        patient = PatientDB.get_by_user_id(current_user["sub"])
        if patient:
            visits = VisitHistoryDB.get_by_patient(patient["id"])
            return [VisitHistory(**v) for v in visits]

    return []


@router.get("/{visit_id}", response_model=VisitHistory)
async def get_visit(
    visit_id: str,
    current_user: dict = Depends(get_current_user)
):
    visit = VisitHistoryDB.get_by_id(visit_id)
    if not visit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Visit record not found"
        )
    return VisitHistory(**visit)
