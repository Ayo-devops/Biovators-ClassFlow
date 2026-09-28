import { BrevoClient } from "@getbrevo/brevo";
import { createClient } from "@supabase/supabase-js";
import { authorizeAdmin } from "../../../lib/admin-auth";

const supabase =
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SECRET_KEY
    ? createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SECRET_KEY,
      )
    : null;

export async function GET(request) {
  const authorization = await authorizeAdmin(request);
  if (authorization.error) return authorization.error;
  return Response.json({ role: "admin" });
}

async function findUserByEmail(email) {
  const perPage = 1000;
  for (let page = 1; page <= 100; page += 1) {
    const result = await supabase.auth.admin.listUsers({ page, perPage });
    if (result.error) throw result.error;
    const user = result.data.users.find(
      (candidate) => candidate.email?.toLowerCase() === email,
    );
    if (user) return user;
    if (result.data.users.length < perPage) return null;
  }
  return null;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function sendSetupEmail({ email, role, actionLink, existing }) {
  const brevo = new BrevoClient({ apiKey: process.env.BREVO_API_KEY });
  const roleName = role === "admin" ? "administrator" : "course representative";
  const safeLink = escapeHtml(actionLink);
  await brevo.transactionalEmails.sendTransacEmail({
    sender: { name: "ClassFlow", email: "akoredeayomide099@gmail.com" },
    to: [{ email }],
    subject: existing
      ? "Complete your ClassFlow workspace access"
      : "You’re invited to the ClassFlow workspace",
    htmlContent:
      `<p>Hello,</p>` +
      `<p>You have been granted <strong>${roleName}</strong> access to the ClassFlow workspace.</p>` +
      `<p><a href="${safeLink}" style="display:inline-block;padding:12px 18px;background:#1f6f5f;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600">Set up workspace access</a></p>` +
      `<p>This secure link expires, so please complete setup promptly. After choosing a password, you will be taken to the admin workspace.</p>` +
      `<p>If you were not expecting this invitation, you can ignore this email.</p>` +
      `<p>— ClassFlow</p>`,
  });
}

export async function POST(request) {
  const authorization = await authorizeAdmin(request);
  if (authorization.error) return authorization.error;
  if (!supabase || !process.env.BREVO_API_KEY)
    return Response.json(
      { error: "Workspace invitations are not configured yet." },
      { status: 503 },
    );
  try {
    const { email, role } = await request.json();
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail || !["admin", "rep"].includes(role)) {
      return Response.json(
        { error: "A valid email and workspace role are required." },
        { status: 400 },
      );
    }

    let invitedUser = await findUserByEmail(normalizedEmail);
    const existing = Boolean(invitedUser);
    const linkResult = await supabase.auth.admin.generateLink({
      type: existing ? "recovery" : "invite",
      email: normalizedEmail,
      options: existing ? undefined : { data: { role } },
    });
    if (linkResult.error) {
      return Response.json(
        { error: linkResult.error.message },
        { status: 500 },
      );
    }
    invitedUser = invitedUser || linkResult.data.user;

    if (!invitedUser) {
      return Response.json(
        { error: "The invitation did not create a user." },
        { status: 500 },
      );
    }

    const { error: roleError } = await supabase.auth.admin.updateUserById(
      invitedUser.id,
      { app_metadata: { ...invitedUser.app_metadata, role } },
    );
    if (roleError) {
      return Response.json({ error: roleError.message }, { status: 500 });
    }

    const tokenHash = linkResult.data.properties?.hashed_token;
    const verificationType = linkResult.data.properties?.verification_type;
    if (!tokenHash || !verificationType) {
      return Response.json(
        { error: "Supabase did not create an invitation link." },
        { status: 500 },
      );
    }
    // Put the one-time token in the URL fragment so it is handled by the
    // browser and never sent to Vercel in an HTTP request or access log.
    const setupUrl = new URL("/admin/set-password", request.url);
    setupUrl.hash = new URLSearchParams({
      token_hash: tokenHash,
      type: verificationType,
    }).toString();
    await sendSetupEmail({
      email: normalizedEmail,
      role,
      actionLink: setupUrl.toString(),
      existing,
    });

    return Response.json({
      success: true,
      existing,
      message: existing
        ? "Access updated and a password setup link was emailed."
        : "Invitation and password setup link emailed successfully.",
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
