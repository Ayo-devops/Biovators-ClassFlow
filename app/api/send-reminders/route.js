 import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

const resend = new Resend(process.env.RESEND_API_KEY)

export async function GET() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const in1Day = new Date(today)
  in1Day.setDate(today.getDate() + 1)

  const in3Days = new Date(today)
  in3Days.setDate(today.getDate() + 3)

  // Fetch students
  const { data: students } = await supabase
    .from('students')
    .select('*')

  if (!students || students.length === 0) {
    return Response.json({ message: 'No students found' })
  }

  // Fetch assignments due today
  const { data: todayAssignments } = await supabase
    .from('assignments')
    .select('*')
    .eq('deadline_date', today.toISOString().split('T')[0])

  // Fetch assignments due in 1 day
  const { data: oneDayAssignments } = await supabase
    .from('assignments')
    .select('*')
    .eq('deadline_date', in1Day.toISOString().split('T')[0])

  // Fetch assignments due in 3 days
  const { data: threeDayAssignments } = await supabase
    .from('assignments')
    .select('*')
    .eq('deadline_date', in3Days.toISOString().split('T')[0])

  let emailsSent = 0

  const sendEmails = async (assignments, subjectPrefix, messageLine) => {
    for (const assignment of assignments) {
      for (const student of students) {
        await resend.emails.send({
          from: 'ClassFlow <onboarding@resend.dev>',
          to: student.student_email,
          subject: `${subjectPrefix} — ${assignment.assignment_title}`,
          html: `
            <p>Hi ${student.student_name},</p>
            <p>${messageLine}</p>
            <br/>
            <p><b>Course:</b> ${assignment.course_title}</p>
            <p><b>Assignment:</b> ${assignment.assignment_title}</p>
            <p><b>Lecturer:</b> ${assignment.lecturer_name}</p>
            <p><b>Deadline:</b> ${assignment.deadline_date}</p>
            <p><b>Submission Method:</b> ${assignment.submission_method}</p>
            <p><b>Priority:</b> ${assignment.priority}</p>
            <br/>
            <p>— ClassFlow</p>
          `
        })
        emailsSent++
      }
    }
  }

  await sendEmails(todayAssignments || [], '[ClassFlow] Due Today', 'Today is the deadline. Submit before it\'s too late.')
  await sendEmails(oneDayAssignments || [], '[ClassFlow] Due Tomorrow', 'This assignment is due TOMORROW. Don\'t wait.')
  await sendEmails(threeDayAssignments || [], '[ClassFlow] Due in 3 Days', 'This assignment is due in 3 days. Start early.')

  return Response.json({ 
    message: 'Reminders sent successfully',
    emailsSent,
    breakdown: {
      today: todayAssignments?.length || 0,
      tomorrow: oneDayAssignments?.length || 0,
      threeDays: threeDayAssignments?.length || 0
    }
  })
}