from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum
from supabase import create_client
from pydantic import BaseModel
from typing import Optional
from datetime import date, datetime, timedelta
from jose import jwt
import os, hashlib
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_methods=["*"], allow_headers=["*"])

sb = create_client(os.environ["NEXT_PUBLIC_SUPABASE_URL"],
                   os.environ["SUPABASE_SERVICE_ROLE_KEY"])
SECRET = os.environ["JWT_SECRET"]

# ─── AUTH ───────────────────────────────────────────

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
        from fastapi import HTTPException
        raise HTTPException(status_code=401, detail="Invalid mobile number or PIN")
    student = res.data[0]
    token = jwt.encode({
        "sub": student["id"],
        "name": student["name"],
        "exp": datetime.utcnow() + timedelta(days=30)
    }, SECRET, algorithm="HS256")
    return {"token": token, "student": student}

# ─── STUDENTS ───────────────────────────────────────

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
    from fastapi import HTTPException
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
    from fastapi import HTTPException
    res = sb.table("students").select("*").eq("id", student_id).execute()
    if not res.data:
        raise HTTPException(404, "Student not found")
    return res.data[0]

# ─── ATTENDANCE ─────────────────────────────────────

class AttendanceIn(BaseModel):
    student_id: str
    class_date: date
    status: str
    note: Optional[str] = None

class BulkAttendanceIn(BaseModel):
    records: list[AttendanceIn]

@app.post("/api/attendance")
def mark_attendance(a: AttendanceIn):
    res = sb.table("attendance").upsert(
        {**a.model_dump(), "class_date": str(a.class_date)},
        on_conflict="student_id,class_date"
    ).execute()
    return res.data[0]

@app.post("/api/attendance/bulk")
def mark_bulk(body: BulkAttendanceIn):
    records = [{**r.model_dump(), "class_date": str(r.class_date)} for r in body.records]
    res = sb.table("attendance").upsert(
        records, on_conflict="student_id,class_date"
    ).execute()
    return {"marked": len(res.data)}

@app.get("/api/attendance")
def get_attendance(student_id: Optional[str] = None, month: Optional[str] = None):
    q = sb.table("attendance").select("*")
    if student_id:
        q = q.eq("student_id", student_id)
    if month:
        q = q.gte("class_date", f"{month}-01").lte("class_date", f"{month}-31")
    return q.order("class_date", desc=True).execute().data

@app.get("/api/attendance/summary")
def get_summary():
    return sb.table("attendance_summary").select("*").order("name").execute().data

# ─── FEES ───────────────────────────────────────────

class FeeIn(BaseModel):
    student_id: str
    month: str
    amount: float
    paid_on: Optional[date] = None
    payment_mode: Optional[str] = None
    status: str = 'pending'

@app.post("/api/fees")
def record_fee(f: FeeIn):
    data = f.model_dump()
    if data.get("paid_on"):
        data["paid_on"] = str(data["paid_on"])
    res = sb.table("fee_payments").upsert(
        data, on_conflict="student_id,month"
    ).execute()
    return res.data[0]

@app.get("/api/fees")
def get_fees(student_id: Optional[str] = None, month: Optional[str] = None, status: Optional[str] = None):
    q = sb.table("fee_payments").select("*, students(name, reg_number)")
    if student_id:
        q = q.eq("student_id", student_id)
    if month:
        q = q.eq("month", month)
    if status:
        q = q.eq("status", status)
    return q.order("month", desc=True).execute().data

# ─── SCHEDULE ───────────────────────────────────────

@app.get("/api/schedule")
def get_schedule():
    return sb.table("schedule").select("*").eq("is_active", True).order("day_of_week").execute().data

handler = Mangum(app)
