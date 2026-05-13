from functools import lru_cache
import os
from pathlib import Path
from typing import Optional, List
from datetime import datetime
from pymongo import MongoClient, ASCENDING, DESCENDING
from pymongo.errors import PyMongoError
from bson import ObjectId
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[2] / '.env')


@lru_cache(maxsize=1)
def get_mongo_client() -> MongoClient:
    mongodb_uri = os.getenv('MONGODB_URI')
    if not mongodb_uri:
        raise RuntimeError('MONGODB_URI is not configured.')
    return MongoClient(mongodb_uri, serverSelectionTimeoutMS=5000)


def get_database():
    client = get_mongo_client()
    db = client.get_default_database()
    if db is None:
        raise RuntimeError("No default database configured in MONGODB_URI")
    return db


def initialize_indexes():
    db = get_database()

    db.users.create_index([("email", ASCENDING)], unique=True)
    db.patients.create_index([("user_id", ASCENDING)])
    db.doctors.create_index([("user_id", ASCENDING)])
    db.doctors.create_index([("specialty", ASCENDING)])
    db.doctors.create_index([("department", ASCENDING)])
    db.doctor_schedules.create_index([("doctor_id", ASCENDING), ("date", ASCENDING)])
    db.appointments.create_index([("patient_id", ASCENDING)])
    db.appointments.create_index([("doctor_id", ASCENDING)])
    db.appointments.create_index([("appointment_date", ASCENDING)])
    db.appointments.create_index([("status", ASCENDING)])
    db.queue.create_index([("doctor_id", ASCENDING), ("status", ASCENDING)])
    db.queue.create_index([("department", ASCENDING), ("status", ASCENDING)])
    db.prescriptions.create_index([("patient_id", ASCENDING)])
    db.prescriptions.create_index([("visit_id", ASCENDING)])
    db.visit_history.create_index([("patient_id", ASCENDING)])
    db.visit_history.create_index([("doctor_id", ASCENDING)])


def serialize_doc(doc: Optional[dict]) -> Optional[dict]:
    if doc is None:
        return None
    if "_id" in doc:
        doc["id"] = str(doc["_id"])
        del doc["_id"]
    return doc


def serialize_docs(docs: List[dict]) -> List[dict]:
    return [serialize_doc(doc) for doc in docs]


class UserDB:
    @staticmethod
    def create(user_data: dict) -> dict:
        db = get_database()
        user_data["created_at"] = datetime.utcnow()
        user_data["is_active"] = True
        result = db.users.insert_one(user_data)
        user_data["id"] = str(result.inserted_id)
        return serialize_doc(user_data)

    @staticmethod
    def get_by_email(email: str) -> Optional[dict]:
        db = get_database()
        user = db.users.find_one({"email": email})
        return serialize_doc(user)

    @staticmethod
    def get_by_id(user_id: str) -> Optional[dict]:
        db = get_database()
        user = db.users.find_one({"_id": ObjectId(user_id)})
        return serialize_doc(user)


class PatientDB:
    @staticmethod
    def create(patient_data: dict) -> dict:
        db = get_database()
        patient_data["created_at"] = datetime.utcnow()
        result = db.patients.insert_one(patient_data)
        patient_data["id"] = str(result.inserted_id)
        return serialize_doc(patient_data)

    @staticmethod
    def get_by_user_id(user_id: str) -> Optional[dict]:
        db = get_database()
        patient = db.patients.find_one({"user_id": user_id})
        return serialize_doc(patient)

    @staticmethod
    def get_by_id(patient_id: str) -> Optional[dict]:
        db = get_database()
        patient = db.patients.find_one({"_id": ObjectId(patient_id)})
        return serialize_doc(patient)

    @staticmethod
    def update(patient_id: str, update_data: dict) -> Optional[dict]:
        db = get_database()
        db.patients.update_one(
            {"_id": ObjectId(patient_id)},
            {"$set": update_data}
        )
        return PatientDB.get_by_id(patient_id)

    @staticmethod
    def search(query: str, limit: int = 50) -> List[dict]:
        db = get_database()
        patients = db.patients.aggregate([
            {
                "$lookup": {
                    "from": "users",
                    "let": {"user_id": {"$toObjectId": "$user_id"}},
                    "pipeline": [
                        {"$match": {"$expr": {"$eq": ["$_id", "$$user_id"]}}}
                    ],
                    "as": "user"
                }
            },
            {"$unwind": "$user"},
            {
                "$match": {
                    "$or": [
                        {"user.full_name": {"$regex": query, "$options": "i"}},
                        {"user.email": {"$regex": query, "$options": "i"}},
                        {"user.phone": {"$regex": query, "$options": "i"}}
                    ]
                }
            },
            {"$limit": limit}
        ])
        return serialize_docs(list(patients))


class DoctorDB:
    @staticmethod
    def create(doctor_data: dict) -> dict:
        db = get_database()
        doctor_data["created_at"] = datetime.utcnow()
        result = db.doctors.insert_one(doctor_data)
        doctor_data["id"] = str(result.inserted_id)
        return serialize_doc(doctor_data)

    @staticmethod
    def get_by_user_id(user_id: str) -> Optional[dict]:
        db = get_database()
        doctor = db.doctors.find_one({"user_id": user_id})
        return serialize_doc(doctor)

    @staticmethod
    def get_by_id(doctor_id: str) -> Optional[dict]:
        db = get_database()
        doctor = db.doctors.find_one({"_id": ObjectId(doctor_id)})
        return serialize_doc(doctor)

    @staticmethod
    def get_all(department: Optional[str] = None, specialty: Optional[str] = None) -> List[dict]:
        db = get_database()
        query = {}
        if department:
            query["department"] = department
        if specialty:
            query["specialty"] = {"$regex": specialty, "$options": "i"}
        doctors = db.doctors.find(query)
        return serialize_docs(list(doctors))


class DoctorScheduleDB:
    @staticmethod
    def create(schedule_data: dict) -> dict:
        db = get_database()
        schedule_data["created_at"] = datetime.utcnow()
        result = db.doctor_schedules.insert_one(schedule_data)
        schedule_data["id"] = str(result.inserted_id)
        return serialize_doc(schedule_data)

    @staticmethod
    def get_by_doctor_and_date(doctor_id: str, date: str) -> Optional[dict]:
        db = get_database()
        schedule = db.doctor_schedules.find_one({"doctor_id": doctor_id, "date": date})
        return serialize_doc(schedule)

    @staticmethod
    def update(schedule_id: str, update_data: dict) -> Optional[dict]:
        db = get_database()
        db.doctor_schedules.update_one(
            {"_id": ObjectId(schedule_id)},
            {"$set": update_data}
        )
        return db.doctor_schedules.find_one({"_id": ObjectId(schedule_id)})

    @staticmethod
    def get_available_slots(doctor_id: str, date: str) -> List[str]:
        schedule = DoctorScheduleDB.get_by_doctor_and_date(doctor_id, date)
        if not schedule or not schedule.get("is_available"):
            return []

        blocked = schedule.get("blocked_slots", [])
        start = schedule["shift_start"]
        end = schedule["shift_end"]
        duration = schedule.get("slot_duration_minutes", 30)

        slots = []
        from datetime import datetime, timedelta
        current = datetime.strptime(start, "%H:%M")
        end_time = datetime.strptime(end, "%H:%M")

        while current < end_time:
            slot = current.strftime("%H:%M")
            if slot not in blocked:
                slots.append(slot)
            current += timedelta(minutes=duration)

        return slots


class AppointmentDB:
    @staticmethod
    def create(appointment_data: dict) -> dict:
        db = get_database()
        appointment_data["created_at"] = datetime.utcnow()
        result = db.appointments.insert_one(appointment_data)
        appointment_data["id"] = str(result.inserted_id)
        return serialize_doc(appointment_data)

    @staticmethod
    def get_by_id(appointment_id: str) -> Optional[dict]:
        db = get_database()
        appointment = db.appointments.find_one({"_id": ObjectId(appointment_id)})
        return serialize_doc(appointment)

    @staticmethod
    def update(appointment_id: str, update_data: dict) -> Optional[dict]:
        db = get_database()
        update_data["updated_at"] = datetime.utcnow()
        db.appointments.update_one(
            {"_id": ObjectId(appointment_id)},
            {"$set": update_data}
        )
        return AppointmentDB.get_by_id(appointment_id)

    @staticmethod
    def get_by_patient(patient_id: str, limit: int = 50) -> List[dict]:
        db = get_database()
        appointments = db.appointments.find({"patient_id": patient_id}).sort("appointment_date", DESCENDING).limit(limit)
        return serialize_docs(list(appointments))

    @staticmethod
    def get_by_doctor(doctor_id: str, date: Optional[str] = None, limit: int = 50) -> List[dict]:
        db = get_database()
        query = {"doctor_id": doctor_id}
        if date:
            query["appointment_date"] = date
        appointments = db.appointments.find(query).sort("appointment_date", DESCENDING).limit(limit)
        return serialize_docs(list(appointments))

    @staticmethod
    def check_slot_available(doctor_id: str, date: str, time: str) -> bool:
        db = get_database()
        existing = db.appointments.find_one({
            "doctor_id": doctor_id,
            "appointment_date": date,
            "appointment_time": time,
            "status": {"$in": ["scheduled", "rescheduled"]}
        })
        return existing is None


class QueueDB:
    @staticmethod
    def create(queue_data: dict) -> dict:
        db = get_database()
        queue_data["created_at"] = datetime.utcnow()

        today = datetime.utcnow().date().isoformat()
        count = db.queue.count_documents({
            "doctor_id": queue_data["doctor_id"],
            "created_at": {"$gte": datetime.fromisoformat(today)}
        })
        queue_data["token_number"] = f"T{count + 1:03d}"

        result = db.queue.insert_one(queue_data)
        queue_data["id"] = str(result.inserted_id)
        return serialize_doc(queue_data)

    @staticmethod
    def get_by_doctor(doctor_id: str, status: Optional[str] = None) -> List[dict]:
        db = get_database()
        query = {"doctor_id": doctor_id}
        if status:
            query["status"] = status

        today = datetime.utcnow().date().isoformat()
        query["created_at"] = {"$gte": datetime.fromisoformat(today)}

        pipeline = [
            {"$match": query},
            {"$addFields": {
                "priority_order": {
                    "$switch": {
                        "branches": [
                            {"case": {"$eq": ["$priority", "emergency"]}, "then": 1},
                            {"case": {"$eq": ["$priority", "senior"]}, "then": 2},
                            {"case": {"$eq": ["$priority", "normal"]}, "then": 3}
                        ],
                        "default": 3
                    }
                }
            }},
            {"$sort": {"priority_order": ASCENDING, "created_at": ASCENDING}}
        ]

        queue = db.queue.aggregate(pipeline)
        return serialize_docs(list(queue))

    @staticmethod
    def update(queue_id: str, update_data: dict) -> Optional[dict]:
        db = get_database()
        update_data["updated_at"] = datetime.utcnow()
        db.queue.update_one(
            {"_id": ObjectId(queue_id)},
            {"$set": update_data}
        )
        return db.queue.find_one({"_id": ObjectId(queue_id)})


class PrescriptionDB:
    @staticmethod
    def create(prescription_data: dict) -> dict:
        db = get_database()
        prescription_data["created_at"] = datetime.utcnow()
        result = db.prescriptions.insert_one(prescription_data)
        prescription_data["id"] = str(result.inserted_id)
        return serialize_doc(prescription_data)

    @staticmethod
    def get_by_patient(patient_id: str, limit: int = 50) -> List[dict]:
        db = get_database()
        prescriptions = db.prescriptions.find({"patient_id": patient_id}).sort("created_at", DESCENDING).limit(limit)
        return serialize_docs(list(prescriptions))

    @staticmethod
    def get_by_visit(visit_id: str) -> Optional[dict]:
        db = get_database()
        prescription = db.prescriptions.find_one({"visit_id": visit_id})
        return serialize_doc(prescription)


class VisitHistoryDB:
    @staticmethod
    def create(visit_data: dict) -> dict:
        db = get_database()
        visit_data["created_at"] = datetime.utcnow()
        result = db.visit_history.insert_one(visit_data)
        visit_data["id"] = str(result.inserted_id)
        return serialize_doc(visit_data)

    @staticmethod
    def get_by_patient(patient_id: str, limit: int = 50) -> List[dict]:
        db = get_database()
        visits = db.visit_history.find({"patient_id": patient_id}).sort("visit_date", DESCENDING).limit(limit)
        return serialize_docs(list(visits))

    @staticmethod
    def get_by_id(visit_id: str) -> Optional[dict]:
        db = get_database()
        visit = db.visit_history.find_one({"_id": ObjectId(visit_id)})
        return serialize_doc(visit)
