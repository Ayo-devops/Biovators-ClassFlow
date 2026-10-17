import { authorizeWorkspaceMember } from "../../../../lib/admin-auth";
import { getWhatsAppStatus } from "../../../../lib/whatsapp-server";

export async function GET(request) {
  const authorization = await authorizeWorkspaceMember(request);
  if (authorization.error) return authorization.error;

  try {
    const status = await getWhatsAppStatus();
    return Response.json({
      connected: Boolean(status.connected),
      chatbotEnabled: Boolean(status.chatbot?.enabled),
      materialsEnabled: Boolean(status.chatbot?.classMaterialsEnabled),
      timetableEnabled: Boolean(status.timetableScheduler?.enabled),
    });
  } catch (error) {
    return Response.json(
      { connected: false, reachable: false, error: error.message },
      { status: 502 },
    );
  }
}
