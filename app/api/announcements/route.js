import { createClient } from "@supabase/supabase-js";
import { BrevoClient } from "@getbrevo/brevo";
import { authorizeWorkspaceMember } from "../../../lib/admin-auth";
import {
  listWhatsAppGroups,
  sendWhatsAppGroup,
} from "../../../lib/whatsapp-server";

const supabase =
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SECRET_KEY,
      )
    : null;

const brevo = new BrevoClient({ apiKey: process.env.BREVO_API_KEY });

export async function GET() {
  if (!supabase)
    return Response.json(
      { error: "Class data is not configured yet." },
      { status: 503 },
    );
  const { data, error } = await supabase
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return Response.json({ error }, { status: 500 });
  return Response.json(data);
}

export async function POST(request) {
  const authorization = await authorizeWorkspaceMember(request);
  if (authorization.error) return authorization.error;
  if (!supabase)
    return Response.json(
      { error: "Class data is not configured yet." },
      { status: 503 },
    );
  try {
    const body = await request.json();
    const title = body.title?.trim();
    const announcementBody = body.body?.trim();
    const postedBy = body.posted_by?.trim();
    const whatsappGroupId = body.whatsapp_group_id?.trim() || "";

    if (!title || !announcementBody || !postedBy) {
      return Response.json(
        { error: "Title, message, and posted-by name are required." },
        { status: 400 },
      );
    }

    if (whatsappGroupId && !whatsappGroupId.endsWith("@g.us")) {
      return Response.json(
        { error: "Choose a valid WhatsApp group." },
        { status: 400 },
      );
    }

    const { data: announcement, error } = await supabase
      .from("announcements")
      .insert([{ title, body: announcementBody, posted_by: postedBy }])
      .select()
      .single();

    if (error) return Response.json({ error }, { status: 500 });

    const { data: students } = await supabase.from("students").select("*");

    let whatsappGroup = null;
    let whatsappWarning = "";
    if (whatsappGroupId) {
      try {
        const { groups = [] } = await listWhatsAppGroups();
        whatsappGroup = groups.find((group) => group.id === whatsappGroupId);
        if (!whatsappGroup) {
          whatsappWarning =
            "The announcement was posted, but the selected WhatsApp group is no longer available.";
        } else {
          await sendWhatsAppGroup(
            whatsappGroup.id,
            `[ClassFlow] Announcement\n\n${announcement.title}\n\n${announcement.body}\n\nPosted by: ${announcement.posted_by}\n\n— ClassFlow`,
          );
        }
      } catch (whatsappError) {
        whatsappWarning = `The announcement was posted, but WhatsApp delivery failed: ${whatsappError.message}`;
      }
    }

    let emailsSent = 0;
    let emailFailures = 0;
    for (const student of students || []) {
      try {
        const emailHtml =
          "<p>Hi " +
          student.student_name +
          ",</p>" +
          "<p>A new announcement has been posted on ClassFlow.</p>" +
          "<br/>" +
          "<p><b>" +
          announcement.title +
          "</b></p>" +
          "<p>" +
          announcement.body.replace(/\n/g, "<br/>") +
          "</p>" +
          "<br/>" +
          "<p>Posted by: " +
          announcement.posted_by +
          "</p>" +
          "<br/>" +
          "<p>-- ClassFlow</p>";

        await brevo.transactionalEmails.sendTransacEmail({
          sender: { name: "ClassFlow", email: "akoredeayomide099@gmail.com" },
          to: [{ email: student.student_email, name: student.student_name }],
          subject: "[ClassFlow] Announcement — " + announcement.title,
          htmlContent: emailHtml,
        });
        emailsSent += 1;
      } catch (emailError) {
        console.log("Email error:", emailError.message);
        emailFailures += 1;
      }
    }

    return Response.json(
      {
        ...announcement,
        delivery: {
          emailsSent,
          emailFailures,
          whatsappGroup: whatsappGroup?.name || null,
          whatsappSent: Boolean(whatsappGroup && !whatsappWarning),
        },
        warning: whatsappWarning || null,
      },
      { status: 201 },
    );
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
