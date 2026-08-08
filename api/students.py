from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum
from supabase import create_client
from pydantic import BaseModel
from typing import Optional
import os, hashlib
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_methods=["*"], allow_headers=["*"])

sb = create_client(os.environ["NEXT_PUBLIC_SUPABASE_URL"],
                   os.environ["SUPABASE_SERVICE_ROLE_KEY"])

class StudentIn(BaseModel):
    reg_number: str
    name: str
    mobile: str
    parent_name: Optional[str] = None
    school_name: Optional[str] = None
    grade: Optional[str] = None
    mode: str
    monthly_fee: float
    payment_cycle: str
    due_day: int
    passcode: str

@app.post("/api/students")
def register_student(s: StudentIn):
    existing = sb.table("students") \
        .select("id") \
        .or_(f"mobile.eq.{s.mobile},reg_number.eq.{s.reg_number}") \
        .execute()
    if existing.data:
        raise HTTPException(400, "Mobile or reg number already exists")
    data = s.model_dump()
    data["passcode"] = hashlib.sha256(s.passcode.encode()).hexdigest()
    res = sb.table("students").insert(data).execute()
    return res.data[0]

@app.get("/api/students")
def list_students(active_only: bool = True):
    q = sb.table("students").select(
        "id,reg_number,name,mobile,parent_name,school_name,"
        "grade,mode,monthly_fee,payment_cycle,due_day,join_date,is_active"
    )
    if active_only:
        q = q.eq("is_active", True)
    return q.order("name").execute().data

@app.get("/api/students/{student_id}")
def get_student(student_id: str):
    res = sb.table("students").select("*") \
        .eq("id", student_id).execute()
    if not res.data:
        raise HTTPException(404, "Student not found")
    return res.data[0]

handler = Mangum(app)