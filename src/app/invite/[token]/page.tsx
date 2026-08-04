import { findInvite } from "@/lib/auth";
import InviteForm from "./form";

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  // This is the one page an outsider reaches while signed out, so a database
  // outage here has to read as an outage rather than as a dead link.
  let invite: Awaited<ReturnType<typeof findInvite>> = null;
  try {
    invite = await findInvite(token);
  } catch (e) {
    console.error("[invite] lookup failed:", e);
    return (
      <div className="auth">
        <div className="auth-box">
          <h1>Temporarily unavailable</h1>
          <p className="sub">
            We could not check your invite just now. Please try again in a few minutes — the link
            itself is still valid.
          </p>
        </div>
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="auth">
        <div className="auth-box">
          <h1>Link expired</h1>
          <p className="sub">
            That invite has already been used or is more than 48 hours old. Ask an admin to send a new one.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth">
      <InviteForm token={token} name={invite.name} email={invite.email} />
    </div>
  );
}
