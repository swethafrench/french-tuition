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
def get_fees(student_id: Optional[str] = None,
             month: Optional[str] = None,
             status: Optional[str] = None):
    q = sb.table("fee_payments").select(
        "*, students(name, reg_number)"
    )
    if student_id:
        q = q.eq("student_id", student_id)
    if month:
        q = q.eq("month", month)
    if status:
        q = q.eq("status", status)
    return q.order("month", desc=True).execute().data

handler = Mangum(app)