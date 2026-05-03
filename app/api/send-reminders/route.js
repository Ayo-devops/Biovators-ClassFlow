import { createClient } from '@supabase/supabase-js'
import { BrevoClient } from '@getbrevo/brevo'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

const brevo = new BrevoClient({ apiKey: process.env.BREVO_API_KEY })

const sendEmails = async (assignments, subjectPrefix, messageLine, students) => {
  for (const assignment of assignments) {
    for (const student of students) {
      try {
        const emailHtml = '<p>Hi ' + student.student_name + ',</p>' +
          '<p>' + messageLine + '</p>' +
          '<br/>' +
          '<p><b>Course:</b> ' + assignment.course_title + '</p>' +
          '<p><b>Assignment:</b> ' + assignment.assignment_title + '</p>' +
          '<p><b>Lecturer:</b> ' + assignment.lecturer_name + '</p>' +
          '<p><b>Deadline:</b> ' + assignment.deadline_date + '</p>' +
          '<p><b>Submission Method:</b> ' + assignment.submission_method + '</p>' +
          '<p><b>Priority:</b> ' + assignment.priority + '</p>' +
          (assignment.description ? '<p><b>Description:</b> ' + assignment.description + '</p>' : '') +
          '<br/>' +
          '<p>-- ClassFlow</p>'

        await brevo.transactionalEmails.sendTransacEmail({
          sender: { name: 'ClassFlow', email: 'akoredeayomide099@gmail.com' },
          to: [{ email: student.student_email, name: student.student_name }],
          subject: subjectPrefix + ' - ' + assignment.assignment_title,
          htmlContent: emailHtml
        })
      } catch (emailError) {
        console.log('Email error:', emailError.message)
      }
    }
  }
}

export async function GET() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const in1Day = new Date(today)
  in1Day.setDate(today.getDate() + 1)

  const in3Days = new Date(today)
  in3Days.setDate(today.getDate() + 3)

  const { data: students } = await supabase.from('students').select('*')

  if (!students || students.length === 0) {
    return Response.json({ message: 'No students found' })
  }

  const { data: todayAssignments } = await supabase
    .from('assignments').select('*')
    .eq('deadline_date', today.toISOString().split('T')[0])

  const { data: oneDayAssignments } = await supabase
    .from('assignments').select('*')
    .eq('deadline_date', in1Day.toISOString().split('T')[0])

  const { data: threeDayAssignments } = await supabase
    .from('assignments').select('*')
    .eq('deadline_date', in3Days.toISOString().split('T')[0])

  await sendEmails(todayAssignments || [], '[ClassFlow] Due Today', 'Today is the deadline. Submit before it is too late.', students)
  await sendEmails(oneDayAssignments || [], '[ClassFlow] Due Tomorrow', 'This assignment is due TOMORROW. Do not wait.', students)
  await sendEmails(threeDayAssignments || [], '[ClassFlow] Due in 3 Days', 'This assignment is due in 3 days. Start early.', students)

  return Response.json({
    message: 'Reminders sent',
    breakdown: {
      today: todayAssignments?.length || 0,
      tomorrow: oneDayAssignments?.length || 0,
      threeDays: threeDayAssignments?.length || 0
    }
  })
}