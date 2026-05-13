from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Optional
from app.models import (
    QueueEntryCreate, QueueEntryUpdate, QueueEntry,
    QueueStatus, QueuePriority, UserRole
)
from app.database import QueueDB, PatientDB, DoctorDB
from app.auth import get_current_user, require_role

router = APIRouter(prefix="/api/queue", tags=["Queue Management"])


@router.post("/", response_model=QueueEntry, status_code=status.HTTP_201_CREATED)
async def add_to_queue(
    queue_data: QueueEntryCreate,
    current_user: dict = Depends(require_role([UserRole.ADMIN, UserRole.STAFF, UserRole.DOCTOR]))
):
    patient = PatientDB.get_by_id(queue_data.patient_id)
    if not patient:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient not found"
        )

    doctor = DoctorDB.get_by_id(queue_data.doctor_id)
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor not found"
        )

    queue_dict = queue_data.model_dump()
    queue_dict["status"] = QueueStatus.WAITING.value
    created_entry = QueueDB.create(queue_dict)
    return QueueEntry(**created_entry)


@router.get("/", response_model=List[QueueEntry])
async def get_queue(
    doctor_id: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    status: Optional[QueueStatus] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    if doctor_id:
        status_filter = status.value if status else None
        queue_entries = QueueDB.get_by_doctor(doctor_id, status_filter)
    else:
        queue_entries = []

    return [QueueEntry(**entry) for entry in queue_entries]


@router.put("/{queue_id}", response_model=QueueEntry)
async def update_queue_entry(
    queue_id: str,
    queue_data: QueueEntryUpdate,
    current_user: dict = Depends(require_role([UserRole.ADMIN, UserRole.STAFF, UserRole.DOCTOR]))
):
    update_dict = {k: v for k, v in queue_data.model_dump().items() if v is not None}
    updated_entry = QueueDB.update(queue_id, update_dict)
    if not updated_entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Queue entry not found"
        )
    return QueueEntry(**serialize_doc(updated_entry))


@router.put("/{queue_id}/call-next")
async def call_next_patient(
    queue_id: str,
    current_user: dict = Depends(require_role([UserRole.ADMIN, UserRole.STAFF, UserRole.DOCTOR]))
):
    from app.database import serialize_doc
    updated_entry = QueueDB.update(queue_id, {"status": QueueStatus.IN_PROGRESS.value})
    if not updated_entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Queue entry not found"
        )
    return QueueEntry(**serialize_doc(updated_entry))


@router.put("/{queue_id}/complete")
async def complete_queue_entry(
    queue_id: str,
    current_user: dict = Depends(require_role([UserRole.ADMIN, UserRole.STAFF, UserRole.DOCTOR]))
):
    from app.database import serialize_doc
    updated_entry = QueueDB.update(queue_id, {"status": QueueStatus.COMPLETED.value})
    if not updated_entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Queue entry not found"
        )
    return QueueEntry(**serialize_doc(updated_entry))
