from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum
from supabase import create_client
from pydantic import BaseModel
from typing import Optional
from datetime import date
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_methods=["*"], allow_headers=["*"])

sb = create_client(os.environ["NEXT_PUBLIC_SUPABASE_URL"],
                   os.environ["SUPABASE_SERVICE_ROLE_KEY"])

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
    records = [{**r.model_dump(),
                "class_date": str(r.class_date)} for r in body.records]
    res = sb.table("attendance").upsert(
        records, on_conflict="student_id,class_date"
    ).execute()
    return {"marked": len(res.data)}

@app.get("/api/attendance")
def get_attendance(student_id: Optional[str] = None,
                   month: Optional[str] = None):
    q = sb.table("attendance").select("*")
    if student_id:
        q = q.eq("student_id", student_id)
    if month:
        q = q.gte("class_date", f"{month}-01") \
             .lte("class_date", f"{month}-31")
    return q.order("class_date", desc=True).execute().data

@app.get("/api/attendance/summary")
def get_summary():
    return sb.table("attendance_summary").select("*") \
        .order("name").execute().data

handler = Mangum(app)