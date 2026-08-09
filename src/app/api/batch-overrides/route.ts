import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  const month = searchParams.get('month')

  let q = sb.from('batch_overrides')
    .select('*, students(id, name, reg_number), batches(id, name, start_time, end_time, days)')

  if (date) q = q.eq('override_date', date)
  else if (month) {
    q = q.gte('override_date', `${month}-01`).lte('override_date', `${month}-31`)
  }

  const { data, error } = await q.order('override_date')
  if (error) return NextResponse.json({ detail: error.message, hint: error.hint }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { data, error } = await sb.from('batch_overrides')
    .upsert(body, { onConflict: 'student_id,override_date' })
    .select('*, students(name, reg_number), batches(name)')
  if (error) return NextResponse.json({ detail: error.message }, { status: 500 })
  return NextResponse.json(data![0])
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  await sb.from('batch_overrides').delete().eq('id', id)
  return NextResponse.json({ success: true })
}
