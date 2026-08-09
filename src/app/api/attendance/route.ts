import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const student_id = searchParams.get('student_id')
  const month = searchParams.get('month')
  const date = searchParams.get('date')
  let q = sb.from('attendance').select('*')
  if (student_id) q = q.eq('student_id', student_id)
  if (date) q = q.eq('class_date', date)
  else if (month) q = q.gte('class_date', `${month}-01`).lte('class_date', `${month}-31`)
  const { data } = await q.order('class_date', { ascending: false })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { data, error } = await sb.from('attendance')
    .upsert(body, { onConflict: 'student_id,class_date' }).select()
  if (error) return NextResponse.json({ detail: error.message }, { status: 500 })
  return NextResponse.json(data![0])
}
