import { BrevoClient } from "@getbrevo/brevo";
import { createClient } from "@supabase/supabase-js";
import { authorizeAdmin } from "../../../lib/admin-auth";
import {
  FILE_BUCKET,
  filesSupabase,
  validateFileDetails,
} from "../../../lib/class-files-server";
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

function messageFor(assignment, attachment) {
  return (
    "[ClassFlow for Biovators · TEST] Assignment delivery\n\n" +
    `Course: ${assignment.course_title}\n` +
    `Assignment: ${assignment.assignment_title}\n` +
    `Lecturer: ${assignment.lecturer_name}\n` +
    `Deadline: ${assignment.deadline_date}\n` +
    `Submission: ${assignment.submission_method}\n` +
    `Priority: ${assignment.priority}` +
    (assignment.description ? `\n\n${assignment.description}` : "") +
    (attachment
      ? `\n\nAttachment: ${attachment.fileName}\n${attachment.downloadUrl}\nThis private link expires in 24 hours.`
      : "") +
    "\n\nThis is a private delivery test. It was not published to Biovators.\n\n— ClassFlow for Biovators"
  );
}

function emailFor(assignment, student, attachment) {
  return (
    `<p>Hi ${escapeHtml(student.student_name)},</p>` +
    "<p><strong>This is a private ClassFlow delivery test.</strong> It was not published to Biovators.</p>" +
    `<p><b>Course:</b> ${escapeHtml(assignment.course_title)}</p>` +
    `<p><b>Assignment:</b> ${escapeHtml(assignment.assignment_title)}</p>` +
    `<p><b>Lecturer:</b> ${escapeHtml(assignment.lecturer_name)}</p>` +
    `<p><b>Deadline:</b> ${escapeHtml(assignment.deadline_date)}</p>` +
    `<p><b>Submission method:</b> ${escapeHtml(assignment.submission_method)}</p>` +
    `<p><b>Priority:</b> ${escapeHtml(assignment.priority)}</p>` +
    (assignment.description
      ? `<p><b>Description:</b></p><p>${escapeHtml(assignment.description).replaceAll("\n", "<br/>")}</p>`
      : "") +
    (attachment
      ? `<p><b>Attachment:</b> <a href="${escapeHtml(attachment.downloadUrl)}">${escapeHtml(attachment.fileName)}</a></p><p><small>This private download link expires in 24 hours.</small></p>`
      : "") +
    "<br/><p>— ClassFlow for Biovators</p>"
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

    let attachment = null;
    if (body.attachment) {
      if (!filesSupabase) {
        return Response.json({ error: "File storage is not configured." }, { status: 503 });
      }
      const validationError = validateFileDetails(body.attachment);
      if (validationError || !String(body.attachment.path || "").startsWith("test-assignments/")) {
        return Response.json({ error: validationError || "The test attachment is invalid." }, { status: 400 });
      }
      const { data, error: linkError } = await filesSupabase.storage
        .from(FILE_BUCKET)
        .createSignedUrl(body.attachment.path, 24 * 60 * 60);
      if (linkError || !data?.signedUrl) {
        return Response.json({ error: "Could not create the private attachment link." }, { status: 500 });
      }
      attachment = {
        fileName: body.attachment.fileName,
        downloadUrl: data.signedUrl,
      };
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
        sender: { name: "ClassFlow for Biovators", email: "akoredeayomide099@gmail.com" },
        to: [{ email: student.student_email, name: student.student_name }],
        subject: `[ClassFlow TEST] ${assignment.assignment_title}`,
        htmlContent: emailFor(assignment, student, attachment),
      });
      results.emails = 1;
    } catch (deliveryError) {
      results.failures.push({ channel: "email", error: deliveryError.message });
    }

    try {
      await sendWhatsApp(student.phone_number, messageFor(assignment, attachment));
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
      attachment: attachment
        ? { fileName: attachment.fileName, path: body.attachment.path, expiresInHours: 24 }
        : null,
      results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  const authorization = await authorizeAdmin(request);
  if (authorization.error) return authorization.error;
  if (!filesSupabase) {
    return Response.json({ error: "File storage is not configured." }, { status: 503 });
  }

  const body = await request.json();
  const path = String(body.path || "");
  if (!path.startsWith("test-assignments/")) {
    return Response.json({ error: "The test attachment path is invalid." }, { status: 400 });
  }
  const { error } = await filesSupabase.storage.from(FILE_BUCKET).remove([path]);
  if (error) return Response.json({ error: "The test attachment could not be removed." }, { status: 500 });
  return Response.json({ message: "Test attachment removed." });
}
