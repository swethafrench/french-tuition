import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json()
  const { data, error } = await sb.table('students')
    .update(body)
    .eq('id', params.id)
    .select()
  if (error) return NextResponse.json({ detail: error.message }, { status: 500 })
  return NextResponse.json(data![0])
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  await sb.table('students').update({ is_active: false }).eq('id', params.id)
  return NextResponse.json({ success: true })
}
