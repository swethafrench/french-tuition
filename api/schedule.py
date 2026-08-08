from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from mangum import Mangum
from supabase import create_client
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_methods=["*"], allow_headers=["*"])

sb = create_client(os.environ["NEXT_PUBLIC_SUPABASE_URL"],
                   os.environ["SUPABASE_SERVICE_ROLE_KEY"])

@app.get("/api/schedule")
def get_schedule():
    return sb.table("schedule").select("*") \
        .eq("is_active", True) \
        .order("day_of_week").execute().data

handler = Mangum(app)