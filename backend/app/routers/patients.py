from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Optional
from app.models import PatientCreate, PatientUpdate, Patient, UserRole
from app.database import PatientDB, UserDB
from app.auth import get_current_user, require_role

router = APIRouter(prefix="/api/patients", tags=["Patients"])


@router.post("/", response_model=Patient, status_code=status.HTTP_201_CREATED)
async def create_patient(
    patient_data: PatientCreate,
    current_user: dict = Depends(get_current_user)
):
    user = UserDB.get_by_id(patient_data.user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    existing_patient = PatientDB.get_by_user_id(patient_data.user_id)
    if existing_patient:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Patient record already exists for this user"
        )

    created_patient = PatientDB.create(patient_data.model_dump())
    return Patient(**created_patient)


@router.get("/me", response_model=Patient)
async def get_my_profile(current_user: dict = Depends(require_role([UserRole.PATIENT]))):
    patient = PatientDB.get_by_user_id(current_user["sub"])
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient profile not found"
        )
    return Patient(**patient)


@router.get("/{patient_id}", response_model=Patient)
async def get_patient(
    patient_id: str,
    current_user: dict = Depends(require_role([UserRole.ADMIN, UserRole.DOCTOR, UserRole.STAFF]))
):
    patient = PatientDB.get_by_id(patient_id)
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )
    return Patient(**patient)


@router.put("/{patient_id}", response_model=Patient)
async def update_patient(
    patient_id: str,
    patient_data: PatientUpdate,
    current_user: dict = Depends(get_current_user)
):
    patient = PatientDB.get_by_id(patient_id)
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )

    if current_user["role"] not in [UserRole.ADMIN.value, UserRole.STAFF.value]:
        if patient["user_id"] != current_user["sub"]:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only update your own profile"
            )

    update_dict = {k: v for k, v in patient_data.model_dump().items() if v is not None}
    updated_patient = PatientDB.update(patient_id, update_dict)
    return Patient(**updated_patient)


@router.get("/", response_model=List[Patient])
async def search_patients(
    q: Optional[str] = Query(None, description="Search query"),
    current_user: dict = Depends(require_role([UserRole.ADMIN, UserRole.DOCTOR, UserRole.STAFF]))
):
    if q:
        patients = PatientDB.search(q)
    else:
        patients = []
    return [Patient(**p) for p in patients]
