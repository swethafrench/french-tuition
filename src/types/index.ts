export interface Student {
  id: string
  reg_number: string
  name: string
  mobile: string
  parent_name: string
  school_name: string
  grade: string
  mode: 'online' | 'direct'
  join_date: string
  fee_type: 'fixed' | 'hourly'
  monthly_fee: number
  hourly_rate: number | null
  hours_per_month: number | null
  payment_cycle: string
  due_day: number
  is_active: boolean
  created_at: string
}

export interface Attendance {
  id: string
  student_id: string
  class_date: string
  status: 'present' | 'absent' | 'leave'
  note?: string
  marked_at: string
}

export interface FeePayment {
  id: string
  student_id: string
  month: string
  amount: number
  paid_on?: string
  payment_mode?: 'cash' | 'upi' | 'bank' | 'online'
  status: 'paid' | 'overdue' | 'pending'
}

export interface Schedule {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
  label: string
  effective_from: string
  is_active: boolean
}

export interface AttendanceSummary {
  id: string
  name: string
  reg_number: string
  school_name: string
  grade: string
  mode: string
  monthly_fee: number
  present_count: number
  absent_count: number
  leave_count: number
  total_classes: number
  attendance_pct: number | null
}