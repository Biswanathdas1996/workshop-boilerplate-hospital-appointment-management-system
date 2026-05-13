from datetime import datetime
from typing import Optional, List
from enum import Enum
from pydantic import BaseModel, EmailStr, Field


class UserRole(str, Enum):
    ADMIN = "admin"
    DOCTOR = "doctor"
    STAFF = "staff"
    PATIENT = "patient"


class AppointmentStatus(str, Enum):
    SCHEDULED = "scheduled"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    RESCHEDULED = "rescheduled"
    NO_SHOW = "no_show"


class QueueStatus(str, Enum):
    WAITING = "waiting"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class QueuePriority(str, Enum):
    NORMAL = "normal"
    SENIOR = "senior"
    EMERGENCY = "emergency"


class DepartmentType(str, Enum):
    CARDIOLOGY = "cardiology"
    NEUROLOGY = "neurology"
    PEDIATRICS = "pediatrics"
    ORTHOPEDICS = "orthopedics"
    GENERAL = "general"
    DIAGNOSTIC = "diagnostic"


class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: UserRole
    phone: Optional[str] = None


class UserCreate(UserBase):
    password: str
    # Doctor-specific fields (only used when role == doctor)
    specialty: Optional[str] = None
    department: Optional[str] = None
    qualification: Optional[str] = None
    experience_years: Optional[int] = None
    consultation_fee: Optional[float] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class User(UserBase):
    id: str
    created_at: datetime
    is_active: bool = True


class Token(BaseModel):
    access_token: str
    token_type: str
    user: User


class PatientBase(BaseModel):
    user_id: str
    date_of_birth: str
    gender: str
    address: str
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    insurance_provider: Optional[str] = None
    insurance_number: Optional[str] = None
    blood_group: Optional[str] = None
    allergies: Optional[List[str]] = []
    medical_history: Optional[List[str]] = []


class PatientCreate(PatientBase):
    pass


class PatientUpdate(BaseModel):
    address: Optional[str] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    insurance_provider: Optional[str] = None
    insurance_number: Optional[str] = None
    blood_group: Optional[str] = None
    allergies: Optional[List[str]] = None
    medical_history: Optional[List[str]] = None


class Patient(PatientBase):
    id: str
    created_at: datetime


class DoctorBase(BaseModel):
    user_id: str
    specialty: str
    department: DepartmentType
    qualification: str
    experience_years: int
    consultation_fee: float


class DoctorCreate(DoctorBase):
    pass


class Doctor(DoctorBase):
    id: str
    created_at: datetime
    full_name: Optional[str] = None


class DoctorScheduleBase(BaseModel):
    doctor_id: str
    date: str
    shift_start: str
    shift_end: str
    slot_duration_minutes: int = 30
    is_available: bool = True
    blocked_slots: Optional[List[str]] = []
    leave_reason: Optional[str] = None


class DoctorScheduleCreate(DoctorScheduleBase):
    pass


class DoctorSchedule(DoctorScheduleBase):
    id: str
    created_at: datetime


class AppointmentBase(BaseModel):
    patient_id: str
    doctor_id: str
    appointment_date: str
    appointment_time: str
    reason: str
    department: DepartmentType
    status: AppointmentStatus = AppointmentStatus.SCHEDULED


class AppointmentCreate(AppointmentBase):
    pass


class AppointmentUpdate(BaseModel):
    appointment_date: Optional[str] = None
    appointment_time: Optional[str] = None
    status: Optional[AppointmentStatus] = None
    reason: Optional[str] = None


class Appointment(AppointmentBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None


class QueueEntryBase(BaseModel):
    patient_id: str
    doctor_id: str
    department: DepartmentType
    token_number: str
    priority: QueuePriority = QueuePriority.NORMAL
    status: QueueStatus = QueueStatus.WAITING
    estimated_wait_time: Optional[int] = None


class QueueEntryCreate(BaseModel):
    patient_id: str
    doctor_id: str
    department: DepartmentType
    priority: Optional[QueuePriority] = QueuePriority.NORMAL


class QueueEntryUpdate(BaseModel):
    status: Optional[QueueStatus] = None
    priority: Optional[QueuePriority] = None


class QueueEntry(QueueEntryBase):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None


class PrescriptionBase(BaseModel):
    patient_id: str
    doctor_id: str
    visit_id: str
    medications: List[dict]
    instructions: Optional[str] = None


class PrescriptionCreate(PrescriptionBase):
    pass


class Prescription(PrescriptionBase):
    id: str
    created_at: datetime


class VisitHistoryBase(BaseModel):
    patient_id: str
    doctor_id: str
    visit_date: str
    diagnosis: str
    symptoms: List[str]
    clinical_notes: Optional[str] = None
    vital_signs: Optional[dict] = None
    is_report_ready: bool = False


class VisitHistoryCreate(VisitHistoryBase):
    pass


class VisitHistory(VisitHistoryBase):
    id: str
    created_at: datetime
