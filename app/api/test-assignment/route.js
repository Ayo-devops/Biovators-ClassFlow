import { BrevoClient } from "@getbrevo/brevo";
import { createClient } from "@supabase/supabase-js";
import { authorizeAdmin } from "../../../lib/admin-auth";
import { sendWhatsApp } from "../../../lib/whatsapp-server";

const supabase =
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SECRET_KEY,
      )
    : null;

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function messageFor(assignment) {
  return (
    "[ClassFlow TEST] Assignment delivery\n\n" +
    `Course: ${assignment.course_title}\n` +
    `Assignment: ${assignment.assignment_title}\n` +
    `Lecturer: ${assignment.lecturer_name}\n` +
    `Deadline: ${assignment.deadline_date}\n` +
    `Submission: ${assignment.submission_method}\n` +
    `Priority: ${assignment.priority}` +
    (assignment.description ? `\n\n${assignment.description}` : "") +
    "\n\nThis is a private delivery test. It was not published to the class.\n\n— ClassFlow"
  );
}

function emailFor(assignment, student) {
  return (
    `<p>Hi ${escapeHtml(student.student_name)},</p>` +
    "<p><strong>This is a private ClassFlow delivery test.</strong> It was not published to the class.</p>" +
    `<p><b>Course:</b> ${escapeHtml(assignment.course_title)}</p>` +
    `<p><b>Assignment:</b> ${escapeHtml(assignment.assignment_title)}</p>` +
    `<p><b>Lecturer:</b> ${escapeHtml(assignment.lecturer_name)}</p>` +
    `<p><b>Deadline:</b> ${escapeHtml(assignment.deadline_date)}</p>` +
    `<p><b>Submission method:</b> ${escapeHtml(assignment.submission_method)}</p>` +
    `<p><b>Priority:</b> ${escapeHtml(assignment.priority)}</p>` +
    (assignment.description
      ? `<p><b>Description:</b></p><p>${escapeHtml(assignment.description).replaceAll("\n", "<br/>")}</p>`
      : "") +
    "<br/><p>— ClassFlow</p>"
  );
}

export async function POST(request) {
  const authorization = await authorizeAdmin(request);
  if (authorization.error) return authorization.error;
  if (!supabase || !process.env.BREVO_API_KEY) {
    return Response.json(
      { error: "Test delivery is not configured yet." },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();
    const assignment = {
      course_title: body.course_title?.trim(),
      assignment_title: body.assignment_title?.trim(),
      lecturer_name: body.lecturer_name?.trim(),
      deadline_date: body.deadline_date,
      submission_method: body.submission_method?.trim(),
      priority: body.priority?.trim(),
      description: body.description?.trim() || "",
    };
    const required = [
      body.studentId,
      assignment.course_title,
      assignment.assignment_title,
      assignment.lecturer_name,
      assignment.deadline_date,
      assignment.submission_method,
      assignment.priority,
    ];
    if (required.some((value) => !value)) {
      return Response.json(
        { error: "Choose one student and complete every required field." },
        { status: 400 },
      );
    }

    const { data: student, error } = await supabase
      .from("students")
      .select("id, student_name, student_email, phone_number")
      .eq("id", body.studentId)
      .single();
    if (error || !student) {
      return Response.json({ error: "Student not found." }, { status: 404 });
    }
    if (!student.student_email || !student.phone_number) {
      return Response.json(
        {
          error:
            "The selected student must have both an email address and WhatsApp number for this two-channel test.",
        },
        { status: 400 },
      );
    }

    const results = { emails: 0, whatsapp: 0, failures: [] };
    const brevo = new BrevoClient({ apiKey: process.env.BREVO_API_KEY });
    try {
      await brevo.transactionalEmails.sendTransacEmail({
        sender: { name: "ClassFlow", email: "akoredeayomide099@gmail.com" },
        to: [{ email: student.student_email, name: student.student_name }],
        subject: `[ClassFlow TEST] ${assignment.assignment_title}`,
        htmlContent: emailFor(assignment, student),
      });
      results.emails = 1;
    } catch (deliveryError) {
      results.failures.push({ channel: "email", error: deliveryError.message });
    }

    try {
      await sendWhatsApp(student.phone_number, messageFor(assignment));
      results.whatsapp = 1;
    } catch (deliveryError) {
      results.failures.push({
        channel: "whatsapp",
        error: deliveryError.message,
      });
    }

    return Response.json({
      message: "Private test delivery completed.",
      saved: false,
      target: { id: student.id, name: student.student_name },
      results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
