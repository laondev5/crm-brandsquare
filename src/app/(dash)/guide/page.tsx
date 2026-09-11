import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { isAdminRole } from "@/lib/types";

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="row" style={{ gap: 14, alignItems: "flex-start", marginBottom: 18 }}>
      <span
        aria-hidden="true"
        style={{
          flex: "none",
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: "var(--p)",
          color: "#fff",
          display: "grid",
          placeItems: "center",
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        {n}
      </span>
      <div>
        <strong style={{ color: "var(--ink)" }}>{title}</strong>
        <div style={{ fontSize: 13.5, color: "var(--txt)", marginTop: 3, lineHeight: 1.6 }}>
          {children}
        </div>
      </div>
    </div>
  );
}

/**
 * How to use the place.
 *
 * Written as the day actually runs rather than as a list of features, because
 * the question people have is "what am I supposed to do now", not "what does
 * this button do".
 */
export default async function GuidePage() {
  const me = await requireUser();
  const manager = isAdminRole(me.role);
  const superAdmin = me.role === "superadmin";

  return (
    <>
      <div className="head">
        <h1>How this works</h1>
      </div>

      <p className="board-hint">
        Everything runs from here — there is no need to open WordPress. This page is the short
        version of how a day goes.
      </p>

      <div className="card">
        <h2>Your day, start to finish</h2>

        <Step n={1} title="Sign in when you start">
          Open <Link href="/work">My work</Link> — it opens on <strong>Today</strong> — and press <strong>Sign in for today</strong>. That
          stamps your start time. You only do this once — if you close the laptop and come back,
          it is still the same day.
        </Step>

        <Step n={2} title="Work your board">
          The <strong>My tasks</strong> tab holds everything assigned to you, in five columns: To do, In progress, Blocked,
          In review, Done. Move a card with the dropdown on it as things change.
        </Step>

        <Step n={3} title="If you get stuck, say so on the card">
          Move the card to <strong>Blocked</strong> and it will ask what is in the way. Write what
          you need and from whom. That sentence is what your manager sees
          {manager ? "" : " — it is how things get unstuck without anyone chasing you"}.
        </Step>

        <Step n={4} title="Sign out with a report">
          Press <strong>Sign out</strong> and answer three things: what you got done, anything
          blocking you, and what is first tomorrow. The first one is required. This is the part
          that replaces being asked for an update.
        </Step>

        <Step n={5} title="Your history stays on the page">
          The <strong>Reports</strong> tab keeps what you wrote, day by day or rolled up by week. The
          weekly view is built from your daily ones, so there is nothing extra to write.
        </Step>
      </div>

      <div className="card">
        <h2>Projects</h2>

        <Step n={1} title="Everything, or one project">
          <Link href="/projects">Projects</Link> opens on all the work. The tabs across the top
          narrow it to one project, and each tab shows how far along that project is.
        </Step>

        <Step n={2} title="Add work as it appears">
          <strong>+ Add a task</strong> at the bottom. Give it a name, pick who is doing it and
          when it is due. If you are inside a project it is filed there automatically.
        </Step>

        {manager && (
          <Step n={3} title="Create a project when work needs grouping">
            <strong>+ New project</strong> above the board. Give it a name, a colour and whoever is
            leading it. Removing a project keeps its tasks — they simply stop belonging to one, so
            nobody loses work they did.
          </Step>
        )}
      </div>

      {manager && (
        <div className="card">
          <h2>Running the team</h2>

          <Step n={1} title="Start at the top of Team overview">
            <Link href="/work/team">Team overview</Link> is ordered by what needs you: what is
            stuck and why, then what is past its due date, then everybody&rsquo;s day.
          </Step>

          <Step n={2} title="Unblock, do not chase">
            Each stuck item carries the sentence the person wrote when they hit the wall, and how
            long it has been sitting. That is usually enough to act on without a meeting.
          </Step>

          <Step n={3} title="Read the day at a glance">
            The bottom table shows who is signed in, how much each person is carrying, and what
            they wrote when they signed out. People who have not signed in still appear — an empty
            row is information too.
          </Step>

          <Step n={4} title="Assign and re-assign from the board">
            Every card has an assignee dropdown for admins. Moving work off somebody who is
            drowning takes one click.
          </Step>
        </div>
      )}

      <div className="card">
        <h2>WhatsApp</h2>

        <Step n={1} title="One inbox for the business number">
          <Link href="/whatsapp">WhatsApp inbox</Link> is shared — everyone sees the same
          conversations, the way a shared phone on a desk works. New messages appear by themselves
          within a few seconds; there is no need to refresh. Under each name it says whose lead it
          is, so check that before you answer someone else&rsquo;s customer.
        </Step>

        <Step n={2} title="The 24-hour rule">
          WhatsApp only lets you type freely to someone who wrote to you in the last 24 hours. After
          that — or to message a lead who has never written — you have to send a{" "}
          <strong>template</strong>. The inbox tells you when a conversation has gone past 24 hours.
        </Step>

        <Step n={3} title="Sending a template">
          In a conversation, press <strong>Template</strong> beside Send. On a lead&rsquo;s page,
          press <strong>Send template</strong> — that starts the WhatsApp conversation if there isn&rsquo;t
          one yet. Pick the template, check the preview, fill in anything the CRM doesn&rsquo;t know,
          and send. When they reply, the 24 hours start again and you can type normally.
        </Step>

        {manager && (
          <Step n={4} title="Writing templates">
            <Link href="/templates/whatsapp">Templates → WhatsApp</Link> →{" "}
            <strong>+ New WhatsApp template</strong>. The tab has step-by-step instructions at the top.
            Give it a name, pick Marketing (anything that sells) or Utility (an update about their
            request), and write the message. Header, footer and buttons are all optional; the
            preview shows exactly what the customer will see. Use the field buttons to add things
            like their first name. Meta reviews every template, usually within minutes, and the
            page updates itself when they answer. A rejected template can&rsquo;t be edited — press{" "}
            <strong>Make a copy</strong>, change the wording and submit again.
          </Step>
        )}
      </div>

      {superAdmin && (
        <div className="card">
          <h2>Meta settings (super admin only)</h2>

          <Step n={1} title="WhatsApp settings — the connection">
            <Link href="/whatsapp/settings">WhatsApp settings</Link> holds the business number&rsquo;s
            IDs, the access token and the app secret. The token and secret are stored encrypted and
            are never shown again after saving — leave those boxes blank to keep what is saved. The
            box on the right says in one line whether messages are arriving, and why not if
            they aren&rsquo;t, with the last 20 calls from Meta underneath.
          </Step>

          <Step n={2} title="Ad datasets — where results are reported">
            <Link href="/settings/meta/datasets">Ad datasets</Link> connects a Meta dataset (the
            one your ads use) by its ID and an access token. For each dataset you pick which
            pipeline stages to report. Add one per ad account; future campaigns just get another
            dataset. The page has the full setup, step by step, at the top.
          </Step>

          <Step n={3} title="Ads — what has been sent">
            When a lead moves into a stage you picked, the CRM tells Meta — with the email and
            phone number scrambled (hashed) so the details themselves never leave. Meta uses that to
            show your ads to people like the ones who actually became customers, not just the ones
            who filled in a form. <Link href="/settings/meta">Ads</Link> shows these reports over the
            last 14 days and a log of each one, including any Meta refused and why.
          </Step>
        </div>
      )}

      <p style={{ color: "var(--muted)", fontSize: 12.5, maxWidth: "70ch" }}>
        One rule worth knowing: you can always move and update your own work, but only an admin can
        reassign a task to somebody else or change a project. The server enforces that, not just
        the screen.
      </p>
    </>
  );
}
