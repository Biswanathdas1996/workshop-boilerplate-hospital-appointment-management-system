from fastapi import APIRouter, HTTPException, status
from app.models import UserCreate, UserLogin, Token, User, UserRole
from app.database import UserDB, PatientDB, DoctorDB
from app.auth import get_password_hash, verify_password, create_access_token

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
async def register(user_data: UserCreate):
    existing_user = UserDB.get_by_email(user_data.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    hashed_password = get_password_hash(user_data.password)
    user_dict = user_data.model_dump()
    user_dict["password"] = hashed_password

    created_user = UserDB.create(user_dict)
    del created_user["password"]

    access_token = create_access_token(
        data={"sub": created_user["id"], "email": created_user["email"], "role": created_user["role"]}
    )

    return Token(
        access_token=access_token,
        token_type="bearer",
        user=User(**created_user)
    )


@router.post("/login", response_model=Token)
async def login(credentials: UserLogin):
    user = UserDB.get_by_email(credentials.email)
    if not user or not verify_password(credentials.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.get("is_active", False):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated"
        )

    access_token = create_access_token(
        data={"sub": user["id"], "email": user["email"], "role": user["role"]}
    )

    del user["password"]

    return Token(
        access_token=access_token,
        token_type="bearer",
        user=User(**user)
    )
