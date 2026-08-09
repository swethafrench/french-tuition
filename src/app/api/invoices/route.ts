import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const student_id = searchParams.get('student_id')
  const month = searchParams.get('month')
  const status = searchParams.get('status')

  let q = sb.from('invoices').select('*, students(name, reg_number, mobile, school_name, grade, mode)')
  if (student_id) q = q.eq('student_id', student_id)
  if (month) q = q.eq('month', month)
  if (status) q = q.eq('status', status)
  const { data, error } = await q.order('month', { ascending: false })
  if (error) return NextResponse.json({ detail: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  // Support bulk insert (array) or single
  const records = Array.isArray(body) ? body : [body]
  const { data, error } = await sb.from('invoices')
    .upsert(records, { onConflict: 'student_id,month' }).select()
  if (error) return NextResponse.json({ detail: error.message }, { status: 500 })
  return NextResponse.json(Array.isArray(body) ? data : data![0])
}
