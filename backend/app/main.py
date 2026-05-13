import os
from pathlib import Path
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pymongo.errors import PyMongoError

from app.database import get_mongo_client, initialize_indexes
from app.routers import auth, patients, doctors, appointments, queue, prescriptions, visits

load_dotenv(Path(__file__).resolve().parents[2] / '.env')

frontend_port = os.getenv('FRONTEND_PORT', '5173')
backend_port = os.getenv('BACKEND_PORT', '8000')


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        initialize_indexes()
        print("Database indexes initialized successfully")
    except Exception as e:
        print(f"Warning: Could not initialize indexes: {e}")
    yield


app = FastAPI(
    title='Hospital Appointment Management System API',
    description='Complete healthcare management system with patient registration, appointments, queue management, and more',
    version='1.0.0',
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[f'http://localhost:{frontend_port}', 'http://localhost:5173'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

app.include_router(auth.router)
app.include_router(patients.router)
app.include_router(doctors.router)
app.include_router(appointments.router)
app.include_router(queue.router)
app.include_router(prescriptions.router)
app.include_router(visits.router)


@app.get('/api/health')
def health_check() -> dict[str, object]:
    backend_status = 'connected'
    database_status = 'disconnected'
    database_name = None

    try:
        client = get_mongo_client()
        client.admin.command('ping')
        default_database = client.get_default_database()
        database_name = default_database.name if default_database is not None else None
        database_status = 'connected'
    except (PyMongoError, RuntimeError):
        database_status = 'disconnected'

    return {
        'frontend': 'active',
        'backend': backend_status,
        'database': database_status,
        'databaseName': database_name,
        'backendPort': backend_port,
    }


@app.get('/api')
def root():
    return {
        'message': 'Hospital Appointment Management System API',
        'version': '1.0.0',
        'docs': '/docs'
    }
