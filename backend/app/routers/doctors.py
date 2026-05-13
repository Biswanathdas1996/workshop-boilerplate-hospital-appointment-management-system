from fastapi import APIRouter, HTTPException, status, Depends, Query
from typing import List, Optional
from app.models import DoctorCreate, Doctor, DoctorScheduleCreate, DoctorSchedule, UserRole, DepartmentType
from app.database import DoctorDB, DoctorScheduleDB, UserDB
from app.auth import get_current_user, require_role

router = APIRouter(prefix="/api/doctors", tags=["Doctors"])


@router.post("/", response_model=Doctor, status_code=status.HTTP_201_CREATED)
async def create_doctor(
    doctor_data: DoctorCreate,
    current_user: dict = Depends(require_role([UserRole.ADMIN]))
):
    user = UserDB.get_by_id(doctor_data.user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    existing_doctor = DoctorDB.get_by_user_id(doctor_data.user_id)
    if existing_doctor:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Doctor record already exists for this user"
        )

    created_doctor = DoctorDB.create(doctor_data.model_dump())
    return Doctor(**created_doctor)


@router.get("/", response_model=List[Doctor])
async def get_doctors(
    department: Optional[str] = Query(None),
    specialty: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    doctors = DoctorDB.get_all(department=department, specialty=specialty)
    return [Doctor(**d) for d in doctors]


@router.get("/me", response_model=Doctor)
async def get_my_doctor_profile(current_user: dict = Depends(require_role([UserRole.DOCTOR]))):
    doctor = DoctorDB.get_by_user_id(current_user["sub"])
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor profile not found"
        )
    return Doctor(**doctor)


@router.get("/{doctor_id}", response_model=Doctor)
async def get_doctor(
    doctor_id: str,
    current_user: dict = Depends(get_current_user)
):
    doctor = DoctorDB.get_by_id(doctor_id)
    if not doctor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Doctor not found"
        )
    return Doctor(**doctor)


@router.post("/schedules", response_model=DoctorSchedule, status_code=status.HTTP_201_CREATED)
async def create_schedule(
    schedule_data: DoctorScheduleCreate,
    current_user: dict = Depends(require_role([UserRole.ADMIN, UserRole.DOCTOR]))
):
    if current_user["role"] == UserRole.DOCTOR.value:
        doctor = DoctorDB.get_by_user_id(current_user["sub"])
        if not doctor or doctor["id"] != schedule_data.doctor_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only manage your own schedule"
            )

    existing = DoctorScheduleDB.get_by_doctor_and_date(schedule_data.doctor_id, schedule_data.date)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Schedule already exists for this date"
        )

    created_schedule = DoctorScheduleDB.create(schedule_data.model_dump())
    return DoctorSchedule(**created_schedule)


@router.get("/{doctor_id}/schedules/{date}/slots")
async def get_available_slots(
    doctor_id: str,
    date: str,
    current_user: dict = Depends(get_current_user)
):
    slots = DoctorScheduleDB.get_available_slots(doctor_id, date)
    return {"available_slots": slots}


@router.put("/schedules/{schedule_id}/block-slots")
async def block_time_slots(
    schedule_id: str,
    blocked_slots: List[str],
    leave_reason: Optional[str] = None,
    current_user: dict = Depends(require_role([UserRole.ADMIN, UserRole.DOCTOR]))
):
    schedule = DoctorScheduleDB.update(schedule_id, {
        "blocked_slots": blocked_slots,
        "leave_reason": leave_reason
    })
    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Schedule not found"
        )
    return DoctorSchedule(**serialize_doc(schedule))


@router.put("/schedules/{schedule_id}/leave")
async def mark_leave(
    schedule_id: str,
    leave_reason: str,
    current_user: dict = Depends(require_role([UserRole.ADMIN, UserRole.DOCTOR]))
):
    from app.database import serialize_doc
    schedule = DoctorScheduleDB.update(schedule_id, {
        "is_available": False,
        "leave_reason": leave_reason
    })
    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Schedule not found"
        )
    return DoctorSchedule(**serialize_doc(schedule))
