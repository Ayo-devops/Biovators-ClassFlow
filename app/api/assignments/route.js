import { createClient } from '@supabase/supabase-js'
import { BrevoClient } from '@getbrevo/brevo'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
)

const brevo = new BrevoClient({ apiKey: process.env.BREVO_API_KEY })

async function sendWhatsApp(phone, message) {
  try {
    if (!phone) return
    const res = await fetch('http://127.0.0.1:3001/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, message })
    })
    const data = await res.json()
    console.log('WhatsApp result:', data)
  } catch (err) {
    console.log('WhatsApp error:', err.message)
  }
}

export async function GET() {
  const { data, error } = await supabase
    .from('assignments')
    .select('*')
    .order('deadline_date', { ascending: true })

  if (error) return Response.json({ error }, { status: 500 })
  return Response.json(data)
}

export async function POST(request) {
  try {
    const body = await request.json()

    const { data: assignment, error } = await supabase
      .from('assignments')
      .insert([body])
      .select()
      .single()

    if (error) return Response.json({ error }, { status: 500 })

    const { data: students, error: studentsError } = await supabase
      .from('students')
      .select('*')

    if (studentsError) return Response.json({ error: studentsError }, { status: 500 })

    for (const student of students) {
      try {
        const emailHtml = '<p>Hi ' + student.student_name + ',</p>' +
          '<p>A new assignment has just been added to ClassFlow.</p>' +
          '<br/>' +
          '<p><b>Course:</b> ' + assignment.course_title + '</p>' +
          '<p><b>Assignment:</b> ' + assignment.assignment_title + '</p>' +
          '<p><b>Lecturer:</b> ' + assignment.lecturer_name + '</p>' +
          '<p><b>Deadline:</b> ' + assignment.deadline_date + '</p>' +
          '<p><b>Submission Method:</b> ' + assignment.submission_method + '</p>' +
          '<p><b>Priority:</b> ' + assignment.priority + '</p>' +
          (assignment.description ? '<p><b>Description:</b></p><p>' + assignment.description.replace(/\n/g, '<br/>') + '</p>' : '') +
          '<br/>' +
          '<p>-- ClassFlow</p>'

        await brevo.transactionalEmails.sendTransacEmail({
          sender: { name: 'ClassFlow', email: 'akoredeayomide099@gmail.com' },
          to: [{ email: student.student_email, name: student.student_name }],
          subject: '[ClassFlow] New Assignment - ' + assignment.assignment_title,
          htmlContent: emailHtml
        })
        console.log('Email sent to:', student.student_email)

        await sendWhatsApp(
          student.phone_number,
          `[ClassFlow] New Assignment\n\n` +
          `Course: ${assignment.course_title}\n` +
          `Assignment: ${assignment.assignment_title}\n` +
          `Lecturer: ${assignment.lecturer_name}\n` +
          `Deadline: ${assignment.deadline_date}\n` +
          `Submission: ${assignment.submission_method}\n` +
          `Priority: ${assignment.priority}` +
          (assignment.description ? `\n\n${assignment.description}` : '') +
          `\n\n— ClassFlow`
        )

      } catch (emailError) {
        console.log('Email error:', emailError.message)
      }
    }

    return Response.json(assignment, { status: 201 })

  } catch (err) {
    console.log('Caught error:', err)
    return Response.json({ error: err.message }, { status: 500 })
  }
}