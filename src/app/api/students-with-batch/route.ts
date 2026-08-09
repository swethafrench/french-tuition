import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET() {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await sb
    .from('students')
    .select('id, name, reg_number, batch_id, mode, is_active')
    .eq('is_active', true)
    .order('name')

  if (error) return NextResponse.json({ detail: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}
