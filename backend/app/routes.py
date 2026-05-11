from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException, Depends, Query
from bson import ObjectId
from pymongo.database import Database

from .models import (
    Patient, PatientCreate, PatientUpdate,
    Doctor, DoctorCreate, DoctorScheduleUpdate, LeaveRequest,
    Appointment, AppointmentCreate, AppointmentUpdate,
    Queue, QueueCreate, QueueUpdate,
    Prescription, PrescriptionCreate,
    Visit, VisitCreate,
    User, UserCreate, UserLogin,
    UserRole, AppointmentStatus
)
from .auth import (
    get_password_hash, verify_password, create_access_token,
    get_current_user, RoleChecker
)
from .database import get_database

router = APIRouter()


# Helper functions
def get_object_id(id_str: str) -> ObjectId:
    try:
        return ObjectId(id_str)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID format")


def serialize_doc(doc):
    if doc and "_id" in doc:
        doc["_id"] = str(doc["_id"])
    return doc


# Auth Routes
@router.post("/api/auth/register")
async def register(user_data: UserCreate):
    db = get_database()
    users = db["users"]

    if users.find_one({"username": user_data.username}):
        raise HTTPException(status_code=400, detail="Username already exists")

    user_dict = user_data.dict()
    user_dict["password_hash"] = get_password_hash(user_dict.pop("password"))
    user_dict["created_at"] = datetime.utcnow()

    result = users.insert_one(user_dict)
    return {"id": str(result.inserted_id), "username": user_data.username}


@router.post("/api/auth/login")
async def login(credentials: UserLogin):
    db = get_database()
    users = db["users"]

    user = users.find_one({"username": credentials.username})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = create_access_token(
        data={"sub": user["username"], "role": user["role"], "user_id": str(user["_id"])}
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user["role"],
        "username": user["username"]
    }


# Patient Routes
@router.post("/api/patients", dependencies=[Depends(RoleChecker([UserRole.ADMIN, UserRole.RECEPTIONIST]))])
async def create_patient(patient: PatientCreate, user: dict = Depends(get_current_user)):
    db = get_database()
    patients = db["patients"]

    patient_dict = patient.dict()
    patient_dict["created_at"] = datetime.utcnow()
    patient_dict["updated_at"] = datetime.utcnow()

    result = patients.insert_one(patient_dict)
    return {"id": str(result.inserted_id), "message": "Patient registered successfully"}


@router.get("/api/patients/{patient_id}")
async def get_patient(patient_id: str, user: dict = Depends(get_current_user)):
    db = get_database()
    patients = db["patients"]

    patient = patients.find_one({"_id": get_object_id(patient_id)})
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    return serialize_doc(patient)


@router.put("/api/patients/{patient_id}", dependencies=[Depends(RoleChecker([UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.DOCTOR]))])
async def update_patient(patient_id: str, updates: PatientUpdate, user: dict = Depends(get_current_user)):
    db = get_database()
    patients = db["patients"]

    update_dict = {k: v for k, v in updates.dict().items() if v is not None}
    if not update_dict:
        raise HTTPException(status_code=400, detail="No updates provided")

    update_dict["updated_at"] = datetime.utcnow()

    result = patients.update_one(
        {"_id": get_object_id(patient_id)},
        {"$set": update_dict}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Patient not found")

    return {"message": "Patient updated successfully"}


@router.get("/api/patients")
async def list_patients(
    skip: int = 0,
    limit: int = 50,
    search: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    db = get_database()
    patients = db["patients"]

    query = {}
    if search:
        query["$or"] = [
            {"first_name": {"$regex": search, "$options": "i"}},
            {"last_name": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}}
        ]

    cursor = patients.find(query).skip(skip).limit(limit)
    patient_list = [serialize_doc(p) for p in cursor]

    return {"patients": patient_list, "count": len(patient_list)}


# Doctor Routes
@router.post("/api/doctors", dependencies=[Depends(RoleChecker([UserRole.ADMIN]))])
async def create_doctor(doctor: DoctorCreate, user: dict = Depends(get_current_user)):
    db = get_database()
    doctors = db["doctors"]

    doctor_dict = doctor.dict()
    doctor_dict["schedule"] = []
    doctor_dict["blocked_slots"] = []
    doctor_dict["leave_periods"] = []
    doctor_dict["created_at"] = datetime.utcnow()

    result = doctors.insert_one(doctor_dict)
    return {"id": str(result.inserted_id), "message": "Doctor created successfully"}


@router.get("/api/doctors/{doctor_id}")
async def get_doctor(doctor_id: str, user: dict = Depends(get_current_user)):
    db = get_database()
    doctors = db["doctors"]

    doctor = doctors.find_one({"_id": get_object_id(doctor_id)})
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    return serialize_doc(doctor)


@router.get("/api/doctors")
async def list_doctors(
    specialty: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    db = get_database()
    doctors = db["doctors"]

    query = {}
    if specialty:
        query["specialty"] = {"$regex": specialty, "$options": "i"}

    cursor = doctors.find(query)
    doctor_list = [serialize_doc(d) for d in cursor]

    return {"doctors": doctor_list}


@router.post("/api/doctors/{doctor_id}/schedule", dependencies=[Depends(RoleChecker([UserRole.ADMIN, UserRole.DOCTOR]))])
async def add_doctor_schedule(doctor_id: str, schedule: DoctorScheduleUpdate, user: dict = Depends(get_current_user)):
    db = get_database()
    doctors = db["doctors"]

    schedule_dict = schedule.dict()

    result = doctors.update_one(
        {"_id": get_object_id(doctor_id)},
        {"$push": {"schedule": schedule_dict}}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Doctor not found")

    return {"message": "Schedule added successfully"}


@router.post("/api/doctors/{doctor_id}/leave", dependencies=[Depends(RoleChecker([UserRole.ADMIN, UserRole.DOCTOR]))])
async def add_doctor_leave(doctor_id: str, leave: LeaveRequest, user: dict = Depends(get_current_user)):
    db = get_database()
    doctors = db["doctors"]

    leave_dict = leave.dict()

    result = doctors.update_one(
        {"_id": get_object_id(doctor_id)},
        {"$push": {"leave_periods": leave_dict}}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Doctor not found")

    return {"message": "Leave added successfully"}


@router.post("/api/doctors/{doctor_id}/block-slot", dependencies=[Depends(RoleChecker([UserRole.ADMIN, UserRole.DOCTOR]))])
async def block_doctor_slot(doctor_id: str, slot_date: datetime, user: dict = Depends(get_current_user)):
    db = get_database()
    doctors = db["doctors"]

    result = doctors.update_one(
        {"_id": get_object_id(doctor_id)},
        {"$push": {"blocked_slots": slot_date}}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Doctor not found")

    return {"message": "Slot blocked successfully"}


# Appointment Routes
@router.post("/api/appointments", dependencies=[Depends(RoleChecker([UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.DOCTOR]))])
async def create_appointment(appointment: AppointmentCreate, user: dict = Depends(get_current_user)):
    db = get_database()
    appointments = db["appointments"]
    doctors = db["doctors"]

    # Check if doctor exists and is available
    doctor = doctors.find_one({"_id": get_object_id(appointment.doctor_id)})
    if not doctor:
        raise HTTPException(status_code=404, detail="Doctor not found")

    # Check for conflicting appointments
    conflict = appointments.find_one({
        "doctor_id": appointment.doctor_id,
        "appointment_date": appointment.appointment_date,
        "status": {"$nin": ["cancelled"]}
    })

    if conflict:
        raise HTTPException(status_code=400, detail="Time slot already booked")

    appointment_dict = appointment.dict()
    appointment_dict["status"] = AppointmentStatus.SCHEDULED.value
    appointment_dict["created_at"] = datetime.utcnow()
    appointment_dict["updated_at"] = datetime.utcnow()

    result = appointments.insert_one(appointment_dict)
    return {"id": str(result.inserted_id), "message": "Appointment booked successfully"}


@router.get("/api/appointments/{appointment_id}")
async def get_appointment(appointment_id: str, user: dict = Depends(get_current_user)):
    db = get_database()
    appointments = db["appointments"]

    appointment = appointments.find_one({"_id": get_object_id(appointment_id)})
    if not appointment:
        raise HTTPException(status_code=404, detail="Appointment not found")

    return serialize_doc(appointment)


@router.put("/api/appointments/{appointment_id}", dependencies=[Depends(RoleChecker([UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.DOCTOR]))])
async def update_appointment(appointment_id: str, updates: AppointmentUpdate, user: dict = Depends(get_current_user)):
    db = get_database()
    appointments = db["appointments"]

    update_dict = {k: v for k, v in updates.dict().items() if v is not None}
    if not update_dict:
        raise HTTPException(status_code=400, detail="No updates provided")

    update_dict["updated_at"] = datetime.utcnow()

    result = appointments.update_one(
        {"_id": get_object_id(appointment_id)},
        {"$set": update_dict}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Appointment not found")

    return {"message": "Appointment updated successfully"}


@router.get("/api/appointments")
async def list_appointments(
    patient_id: Optional[str] = None,
    doctor_id: Optional[str] = None,
    status: Optional[str] = None,
    date: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    db = get_database()
    appointments = db["appointments"]

    query = {}
    if patient_id:
        query["patient_id"] = patient_id
    if doctor_id:
        query["doctor_id"] = doctor_id
    if status:
        query["status"] = status
    if date:
        query["appointment_date"] = {"$gte": datetime.fromisoformat(date)}

    cursor = appointments.find(query).sort("appointment_date", 1)
    appointment_list = [serialize_doc(a) for a in cursor]

    return {"appointments": appointment_list}


# Queue Routes
@router.post("/api/queue", dependencies=[Depends(RoleChecker([UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.NURSE]))])
async def add_to_queue(queue_item: QueueCreate, user: dict = Depends(get_current_user)):
    db = get_database()
    queue = db["queue"]

    # Get next token number
    last_token = queue.find_one(sort=[("token_number", -1)])
    token_number = (last_token["token_number"] + 1) if last_token else 1

    queue_dict = queue_item.dict()
    queue_dict["token_number"] = token_number
    queue_dict["status"] = "waiting"
    queue_dict["created_at"] = datetime.utcnow()
    queue_dict["updated_at"] = datetime.utcnow()

    result = queue.insert_one(queue_dict)
    return {"id": str(result.inserted_id), "token_number": token_number, "message": "Added to queue"}


@router.get("/api/queue")
async def get_queue(
    doctor_id: Optional[str] = None,
    department: Optional[str] = None,
    status: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    db = get_database()
    queue = db["queue"]

    query = {}
    if doctor_id:
        query["doctor_id"] = doctor_id
    if department:
        query["department"] = department
    if status:
        query["status"] = status
    else:
        query["status"] = {"$ne": "completed"}

    # Sort by priority (emergency first) and then by token number
    cursor = queue.find(query).sort([("priority", -1), ("token_number", 1)])
    queue_list = [serialize_doc(q) for q in cursor]

    return {"queue": queue_list}


@router.put("/api/queue/{queue_id}", dependencies=[Depends(RoleChecker([UserRole.ADMIN, UserRole.RECEPTIONIST, UserRole.NURSE, UserRole.DOCTOR]))])
async def update_queue(queue_id: str, updates: QueueUpdate, user: dict = Depends(get_current_user)):
    db = get_database()
    queue = db["queue"]

    update_dict = {k: v for k, v in updates.dict().items() if v is not None}
    if not update_dict:
        raise HTTPException(status_code=400, detail="No updates provided")

    update_dict["updated_at"] = datetime.utcnow()

    result = queue.update_one(
        {"_id": get_object_id(queue_id)},
        {"$set": update_dict}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Queue item not found")

    return {"message": "Queue updated successfully"}


# Prescription Routes
@router.post("/api/prescriptions", dependencies=[Depends(RoleChecker([UserRole.DOCTOR]))])
async def create_prescription(prescription: PrescriptionCreate, user: dict = Depends(get_current_user)):
    db = get_database()
    prescriptions = db["prescriptions"]

    prescription_dict = prescription.dict()
    prescription_dict["created_at"] = datetime.utcnow()

    result = prescriptions.insert_one(prescription_dict)
    return {"id": str(result.inserted_id), "message": "Prescription created successfully"}


@router.get("/api/prescriptions/{prescription_id}")
async def get_prescription(prescription_id: str, user: dict = Depends(get_current_user)):
    db = get_database()
    prescriptions = db["prescriptions"]

    prescription = prescriptions.find_one({"_id": get_object_id(prescription_id)})
    if not prescription:
        raise HTTPException(status_code=404, detail="Prescription not found")

    return serialize_doc(prescription)


@router.get("/api/prescriptions")
async def list_prescriptions(
    patient_id: Optional[str] = None,
    doctor_id: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    db = get_database()
    prescriptions = db["prescriptions"]

    query = {}
    if patient_id:
        query["patient_id"] = patient_id
    if doctor_id:
        query["doctor_id"] = doctor_id

    cursor = prescriptions.find(query).sort("created_at", -1)
    prescription_list = [serialize_doc(p) for p in cursor]

    return {"prescriptions": prescription_list}


# Visit Routes
@router.post("/api/visits", dependencies=[Depends(RoleChecker([UserRole.DOCTOR]))])
async def create_visit(visit: VisitCreate, user: dict = Depends(get_current_user)):
    db = get_database()
    visits = db["visits"]

    visit_dict = visit.dict()
    visit_dict["visit_date"] = datetime.utcnow()
    visit_dict["created_at"] = datetime.utcnow()

    result = visits.insert_one(visit_dict)
    return {"id": str(result.inserted_id), "message": "Visit recorded successfully"}


@router.get("/api/visits/{visit_id}")
async def get_visit(visit_id: str, user: dict = Depends(get_current_user)):
    db = get_database()
    visits = db["visits"]

    visit = visits.find_one({"_id": get_object_id(visit_id)})
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")

    return serialize_doc(visit)


@router.get("/api/visits")
async def list_visits(
    patient_id: Optional[str] = None,
    doctor_id: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    db = get_database()
    visits = db["visits"]

    query = {}
    if patient_id:
        query["patient_id"] = patient_id
    if doctor_id:
        query["doctor_id"] = doctor_id

    cursor = visits.find(query).sort("visit_date", -1)
    visit_list = [serialize_doc(v) for v in cursor]

    return {"visits": visit_list}


# Search Routes
@router.get("/api/search")
async def search_records(
    query: str = Query(..., min_length=2),
    type: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    db = get_database()
    results = {"patients": [], "doctors": [], "appointments": []}

    search_regex = {"$regex": query, "$options": "i"}

    if not type or type == "patients":
        patients = db["patients"].find({
            "$or": [
                {"first_name": search_regex},
                {"last_name": search_regex},
                {"phone": search_regex}
            ]
        }).limit(10)
        results["patients"] = [serialize_doc(p) for p in patients]

    if not type or type == "doctors":
        doctors = db["doctors"].find({
            "$or": [
                {"first_name": search_regex},
                {"last_name": search_regex},
                {"specialty": search_regex}
            ]
        }).limit(10)
        results["doctors"] = [serialize_doc(d) for d in doctors]

    if not type or type == "appointments":
        appointments = db["appointments"].find({}).limit(10)
        results["appointments"] = [serialize_doc(a) for a in appointments]

    return results
