import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { records } = await req.json()
  const { data, error } = await sb.from('attendance')
    .upsert(records, { onConflict: 'student_id,class_date' }).select()
  if (error) return NextResponse.json({ detail: error.message }, { status: 500 })
  return NextResponse.json({ marked: data!.length })
}
