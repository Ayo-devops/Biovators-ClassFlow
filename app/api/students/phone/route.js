import { createClient } from "@supabase/supabase-js";
import { normalizeWhatsAppNumber } from "../../../../lib/phone";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

export async function PATCH(request) {
  if (!supabaseUrl || !supabaseAnonKey || !supabaseSecretKey) {
    return Response.json(
      { error: "Student updates are not configured yet." },
      { status: 503 },
    );
  }

  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return Response.json({ error: "Authentication is required." }, { status: 401 });
  }

  const token = authorization.slice("Bearer ".length);
  const authClient = createClient(supabaseUrl, supabaseAnonKey);
  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser(token);

  if (authError || !user?.email) {
    return Response.json({ error: "Your verification link is invalid or expired." }, { status: 401 });
  }

  const { phone_number: rawPhone } = await request.json();
  const phoneNumber = normalizeWhatsAppNumber(rawPhone);

  if (phoneNumber.length < 10 || phoneNumber.length > 15) {
    return Response.json(
      { error: "Enter a valid WhatsApp number with its country code." },
      { status: 400 },
    );
  }

  const adminClient = createClient(supabaseUrl, supabaseSecretKey);
  const { data, error } = await adminClient
    .from("students")
    .update({ phone_number: phoneNumber })
    .ilike("student_email", user.email)
    .select("id");

  if (error) return Response.json({ error: error.message }, { status: 500 });
  if (!data?.length) {
    return Response.json(
      { error: "No reminder registration was found for this email address." },
      { status: 404 },
    );
  }

  return Response.json({ success: true, updated: data.length });
}
