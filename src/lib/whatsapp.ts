// WhatsApp deep link helper
// Opens WhatsApp with a pre-filled message to the given mobile number

export function whatsappLink(mobile: string, message: string): string {
  // Normalize mobile: strip spaces, dashes, ensure country code
  let num = mobile.replace(/[\s\-\(\)]/g, '')
  if (num.startsWith('0')) num = '91' + num.slice(1)
  if (!num.startsWith('+') && !num.startsWith('91')) num = '91' + num
  num = num.replace(/^\+/, '')
  const encoded = encodeURIComponent(message)
  return `https://wa.me/${num}?text=${encoded}`
}

export function invoiceMessage(
  studentName: string,
  month: string,
  amount: number,
  upiId: string,
  status: string
): string {
  const monthFmt = (() => {
    const [y, m] = month.split('-')
    return new Date(+y, +m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
  })()
  const amountFmt = `Rs.${amount.toLocaleString('en-IN')}`

  if (status === 'overdue') {
    return `Hi ${studentName},

This is a reminder that your Apprenons French Tuition fee for *${monthFmt}* of *${amountFmt}* is overdue.

Please make the payment at your earliest convenience.

UPI ID: *${upiId}*

Thank you,
Apprenons French Tuition`
  }

  return `Hi ${studentName},

Your Apprenons French Tuition invoice for *${monthFmt}* is ready.

Amount due: *${amountFmt}*

You can pay via UPI:
UPI ID: *${upiId}*

Please open your student app to scan the QR code and pay directly.

Thank you,
Apprenons French Tuition`
}

export function attendanceMessage(
  studentName: string,
  parentName: string,
  date: string,
  status: 'absent' | 'leave'
): string {
  const dateFmt = new Date(date).toLocaleDateString('en-IN', {
    weekday: 'long', day: 'numeric', month: 'long'
  })
  if (status === 'absent') {
    return `Hi ${parentName || studentName},

This is to inform you that *${studentName}* was marked *absent* for the French class on *${dateFmt}*.

If this was an error, please let us know.

Regards,
Apprenons French Tuition`
  }
  return `Hi ${parentName || studentName},

This is to inform you that *${studentName}*'s leave has been recorded for the French class on *${dateFmt}*.

Regards,
Apprenons French Tuition`
}

export function generalMessage(studentName: string): string {
  return `Hi, this is Apprenons French Tuition regarding ${studentName}.`
}
