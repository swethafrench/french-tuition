import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { SignJWT } from 'jose'
import { createHash } from 'crypto'

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  const { mobile, passcode } = await req.json()
  const hashed = createHash('sha256').update(passcode).digest('hex')
  const { data } = await sb.from('students')
    .select('id,name,reg_number,grade,school_name,mode')
    .eq('mobile', mobile)
    .eq('passcode', hashed)
    .eq('is_active', true)
  if (!data || data.length === 0) {
    return NextResponse.json({ detail: 'Invalid mobile or PIN' }, { status: 401 })
  }
  const student = data[0]
  const secret = new TextEncoder().encode(process.env.JWT_SECRET!)
  const token = await new SignJWT({ sub: student.id, name: student.name })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .sign(secret)
  return NextResponse.json({ token, student })
}
