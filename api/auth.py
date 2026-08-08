from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum
from supabase import create_client
from pydantic import BaseModel
from jose import jwt
from datetime import datetime, timedelta
import os, hashlib
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_methods=["*"], allow_headers=["*"])

sb = create_client(os.environ["NEXT_PUBLIC_SUPABASE_URL"],
                   os.environ["SUPABASE_SERVICE_ROLE_KEY"])
SECRET = os.environ["JWT_SECRET"]

class LoginIn(BaseModel):
    mobile: str
    passcode: str

@app.post("/api/auth/login")
def student_login(body: LoginIn):
    hashed = hashlib.sha256(body.passcode.encode()).hexdigest()
    res = sb.table("students") \
        .select("id,name,reg_number,grade,school_name,mode") \
        .eq("mobile", body.mobile) \
        .eq("passcode", hashed) \
        .eq("is_active", True) \
        .execute()
    if not res.data:
        raise HTTPException(status_code=401,
                            detail="Invalid mobile number or PIN")
    student = res.data[0]
    token = jwt.encode({
        "sub": student["id"],
        "name": student["name"],
        "exp": datetime.utcnow() + timedelta(days=30)
    }, SECRET, algorithm="HS256")
    return {"token": token, "student": student}

handler = Mangum(app)