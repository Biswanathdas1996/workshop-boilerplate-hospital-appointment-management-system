from datetime import datetime
from enum import Enum
from typing import Optional, List
from pydantic import BaseModel, Field, EmailStr


class UserRole(str, Enum):
    ADMIN = "admin"
    DOCTOR = "doctor"
    NURSE = "nurse"
    RECEPTIONIST = "receptionist"
    RECORDS_STAFF = "records_staff"


class FacilityType(str, Enum):
    HOSPITAL = "hospital"
    CLINIC = "clinic"
    DIAGNOSTIC_CENTER = "diagnostic_center"


class AppointmentStatus(str, Enum):
    SCHEDULED = "scheduled"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    RESCHEDULED = "rescheduled"


class QueuePriority(str, Enum):
    NORMAL = "normal"
    SENIOR_CITIZEN = "senior_citizen"
    EMERGENCY = "emergency"


# User Models
class User(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    username: str
    email: EmailStr
    password_hash: str
    role: UserRole
    created_at: datetime = Field(default_factory=datetime.utcnow)


class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: UserRole


class UserLogin(BaseModel):
    username: str
    password: str


# Patient Models
class EmergencyContact(BaseModel):
    name: str
    relationship: str
    phone: str


class InsuranceInfo(BaseModel):
    provider: str
    policy_number: str
    valid_until: Optional[datetime] = None


class MedicalProfile(BaseModel):
    blood_group: Optional[str] = None
    allergies: List[str] = []
    chronic_conditions: List[str] = []
    current_medications: List[str] = []


class Patient(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    first_name: str
    last_name: str
    date_of_birth: datetime
    gender: str
    phone: str
    email: Optional[EmailStr] = None
    address: str
    emergency_contact: Optional[EmergencyContact] = None
    insurance: Optional[InsuranceInfo] = None
    medical_profile: MedicalProfile = Field(default_factory=MedicalProfile)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class PatientCreate(BaseModel):
    first_name: str
    last_name: str
    date_of_birth: datetime
    gender: str
    phone: str
    email: Optional[EmailStr] = None
    address: str
    emergency_contact: Optional[EmergencyContact] = None
    insurance: Optional[InsuranceInfo] = None
    medical_profile: Optional[MedicalProfile] = None


class PatientUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    emergency_contact: Optional[EmergencyContact] = None
    insurance: Optional[InsuranceInfo] = None
    medical_profile: Optional[MedicalProfile] = None


# Doctor Models
class DoctorSchedule(BaseModel):
    date: datetime
    shift_start: str  # HH:MM format
    shift_end: str  # HH:MM format
    is_available: bool = True


class Doctor(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    first_name: str
    last_name: str
    specialty: str
    phone: str
    email: EmailStr
    license_number: str
    schedule: List[DoctorSchedule] = []
    blocked_slots: List[datetime] = []
    leave_periods: List[dict] = []  # {start_date, end_date, reason}
    created_at: datetime = Field(default_factory=datetime.utcnow)


class DoctorCreate(BaseModel):
    first_name: str
    last_name: str
    specialty: str
    phone: str
    email: EmailStr
    license_number: str


class DoctorScheduleUpdate(BaseModel):
    date: datetime
    shift_start: str
    shift_end: str
    is_available: bool = True


class LeaveRequest(BaseModel):
    start_date: datetime
    end_date: datetime
    reason: str


# Appointment Models
class Appointment(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    patient_id: str
    doctor_id: str
    appointment_date: datetime
    duration_minutes: int = 30
    status: AppointmentStatus = AppointmentStatus.SCHEDULED
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class AppointmentCreate(BaseModel):
    patient_id: str
    doctor_id: str
    appointment_date: datetime
    duration_minutes: int = 30
    notes: Optional[str] = None


class AppointmentUpdate(BaseModel):
    appointment_date: Optional[datetime] = None
    status: Optional[AppointmentStatus] = None
    notes: Optional[str] = None


# Queue Models
class Queue(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    patient_id: str
    doctor_id: Optional[str] = None
    department: Optional[str] = None
    token_number: int
    priority: QueuePriority = QueuePriority.NORMAL
    status: str = "waiting"  # waiting, in_consultation, completed
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class QueueCreate(BaseModel):
    patient_id: str
    doctor_id: Optional[str] = None
    department: Optional[str] = None
    priority: QueuePriority = QueuePriority.NORMAL


class QueueUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[QueuePriority] = None


# Prescription Models
class Medication(BaseModel):
    name: str
    dosage: str
    frequency: str
    duration: str
    instructions: Optional[str] = None


class Prescription(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    patient_id: str
    doctor_id: str
    visit_id: Optional[str] = None
    medications: List[Medication]
    notes: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class PrescriptionCreate(BaseModel):
    patient_id: str
    doctor_id: str
    visit_id: Optional[str] = None
    medications: List[Medication]
    notes: Optional[str] = None


# Visit Models
class Diagnosis(BaseModel):
    condition: str
    icd_code: Optional[str] = None
    notes: Optional[str] = None


class Visit(BaseModel):
    id: Optional[str] = Field(None, alias="_id")
    patient_id: str
    doctor_id: str
    visit_date: datetime = Field(default_factory=datetime.utcnow)
    chief_complaint: str
    vitals: dict = {}  # {bp, pulse, temperature, weight, etc}
    diagnoses: List[Diagnosis] = []
    clinical_notes: Optional[str] = None
    follow_up_date: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)


class VisitCreate(BaseModel):
    patient_id: str
    doctor_id: str
    chief_complaint: str
    vitals: Optional[dict] = None
    diagnoses: Optional[List[Diagnosis]] = None
    clinical_notes: Optional[str] = None
    follow_up_date: Optional[datetime] = None
