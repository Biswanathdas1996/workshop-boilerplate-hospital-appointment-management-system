"""Seed script to insert dummy doctors into the database."""
import sys
import os
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent.parent / '.env')

import bcrypt
from datetime import datetime
from app.database import get_database, serialize_doc
from bson import ObjectId

DOCTORS = [
    {
        "user": {
            "full_name": "Sarah Mitchell",
            "email": "sarah.mitchell@hospital.com",
            "phone": "+1-555-0101",
            "role": "doctor",
        },
        "profile": {
            "specialty": "Cardiologist",
            "department": "cardiology",
            "qualification": "MD, FACC",
            "experience_years": 12,
            "consultation_fee": 150.0,
        },
    },
    {
        "user": {
            "full_name": "James Okafor",
            "email": "james.okafor@hospital.com",
            "phone": "+1-555-0102",
            "role": "doctor",
        },
        "profile": {
            "specialty": "Neurologist",
            "department": "neurology",
            "qualification": "MD, PhD",
            "experience_years": 9,
            "consultation_fee": 140.0,
        },
    },
    {
        "user": {
            "full_name": "Priya Sharma",
            "email": "priya.sharma@hospital.com",
            "phone": "+1-555-0103",
            "role": "doctor",
        },
        "profile": {
            "specialty": "Pediatrician",
            "department": "pediatrics",
            "qualification": "MD, FAAP",
            "experience_years": 7,
            "consultation_fee": 120.0,
        },
    },
    {
        "user": {
            "full_name": "David Chen",
            "email": "david.chen@hospital.com",
            "phone": "+1-555-0104",
            "role": "doctor",
        },
        "profile": {
            "specialty": "Orthopedic Surgeon",
            "department": "orthopedics",
            "qualification": "MD, FAAOS",
            "experience_years": 15,
            "consultation_fee": 175.0,
        },
    },
    {
        "user": {
            "full_name": "Emily Reyes",
            "email": "emily.reyes@hospital.com",
            "phone": "+1-555-0105",
            "role": "doctor",
        },
        "profile": {
            "specialty": "General Physician",
            "department": "general",
            "qualification": "MBBS, MD",
            "experience_years": 5,
            "consultation_fee": 100.0,
        },
    },
    {
        "user": {
            "full_name": "Michael Torres",
            "email": "michael.torres@hospital.com",
            "phone": "+1-555-0106",
            "role": "doctor",
        },
        "profile": {
            "specialty": "Radiologist",
            "department": "diagnostic",
            "qualification": "MD, FRCR",
            "experience_years": 11,
            "consultation_fee": 130.0,
        },
    },
]

DEFAULT_PASSWORD = "Doctor@123"


def seed():
    db = get_database()
    hashed_pw = bcrypt.hashpw(DEFAULT_PASSWORD.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")
    created = 0
    skipped = 0

    for entry in DOCTORS:
        email = entry["user"]["email"]

        existing = db.users.find_one({"email": email})
        if existing:
            print(f"  SKIP  {email} (already exists)")
            skipped += 1
            continue

        user_doc = {
            **entry["user"],
            "password": hashed_pw,
            "is_active": True,
            "created_at": datetime.utcnow(),
        }
        result = db.users.insert_one(user_doc)
        user_id = str(result.inserted_id)

        doctor_doc = {
            **entry["profile"],
            "user_id": user_id,
            "created_at": datetime.utcnow(),
        }
        db.doctors.insert_one(doctor_doc)

        print(f"  CREATED  Dr. {entry['user']['full_name']} <{email}>")
        created += 1

    print(f"\nDone — {created} created, {skipped} skipped.")
    print(f"Default password for all new doctors: {DEFAULT_PASSWORD}")


if __name__ == "__main__":
    seed()
