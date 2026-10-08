import Link from "next/link";
import { requireMember } from "@/lib/auth";
import { canOversee, isAdminRole, isSuperRole } from "@/lib/types";

function Step({ n, title, children }: { n: number | string; title: string; children: React.ReactNode }) {
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
  const me = await requireMember();
  const manager = isAdminRole(me.role);
  const superAdmin = isSuperRole(me.role);
  const author = me.role === "author";
  const md = me.role === "md";
  const overseer = canOversee(me.role);
  const blogger = author || manager;

  return (
    <>
      <div className="head">
        <h1>How this works</h1>
      </div>

      <p className="board-hint">
        Everything runs from here — there is no need to open WordPress. This page is the short
        version of how a day goes.
      </p>

      {overseer && (
        <div className="card">
          <h2>Executive report</h2>

          <Step n={1} title="Everything on one page">
            <Link href="/executive">Executive report</Link> opens on the last 7 days. Press{" "}
            <strong>24 hours</strong>, <strong>30 days</strong> or <strong>90 days</strong> to change
            the period; every number is compared with the period before it.
          </Step>

          <Step n={2} title="Read the headline numbers and charts">
            New leads, deals won, win rate, website visitors and WhatsApp messages across the top, then
            the trend, the pipeline, which campaigns brought leads in and where visitors came from.
          </Step>

          <Step n={3} title="See every person side by side">
            <strong>Team performance</strong> is one table with a row per person: when they signed
            in, their leads, follow-ups that are late, deals won, notes, WhatsApp messages and tasks.
            Click the column names to sort. Nobody has to be opened one at a time.
          </Step>

          <Step n={4} title="Read the daily reports and the activity">
            <strong>Daily reports</strong> lists what everyone wrote when they signed out, newest
            first, with blockers highlighted and who was asked to fix them. Pick a person to see only
            theirs. <strong>Activity</strong> is every change made on a lead, by whom and when.
          </Step>

          <Step n={5} title="Have it read to you">
            <strong>Listen to this report</strong> reads the whole report aloud — the headline
            numbers, what needs attention, the pipeline, each person, the daily reports and a summary
            of the activity. It follows whichever period is chosen. You can pause, skip to a section,
            or speed it up. The voice is your browser&rsquo;s own, so it is free. Blockers still
            waiting are read first, at most 12 daily reports are read out, and the rest stay on the
            screen. A voice marked <em>online</em> sends the text to Microsoft or Google to be
            spoken; the others stay on your computer.
          </Step>
        </div>
      )}

      {!md && (
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
          that replaces being asked for an update. If someone else can clear your blocker, pick
          them under <strong>Who can fix this?</strong> — they get an email and see it on their My
          work page. It is optional.
        </Step>

        <Step n={5} title="Your history stays on the page">
          The <strong>Reports</strong> tab keeps what you wrote, day by day or rolled up by week. The
          weekly view is built from your daily ones, so there is nothing extra to write.
        </Step>

        <Step n={6} title="When someone tags you on a blocker">
          It appears at the top of <Link href="/work">My work</Link> under{" "}
          <strong>Blockers waiting on you</strong>, and you get an email. Sort it out, then press{" "}
          <strong>Mark as cleared</strong> so they know.
        </Step>
      </div>
      )}

      {!md && (
      <div className="card">
        <h2>Machine requests</h2>

        <Step n={1} title="Log the enquiry the moment it lands">
          <Link href="/requests">Machine requests</Link> → <strong>+ New machine request</strong>. The only
          thing you must type is the <strong>phone number</strong> — a WhatsApp enquiry usually has nothing
          else. Add the machine and capacity if you know them.
        </Step>

        <Step n={2} title="Fill in the rest when the customer gives it">
          Name, company and email show as <em>Not provided</em> until someone adds them. Open the request and
          press <strong>Edit details</strong> when the customer tells you.
        </Step>

        <Step n={3} title="Move it along">
          Two statuses run side by side. The request goes New → Sourcing → Breakdown pending → Breakdown
          ready → Sent to sales → Completed, and the <strong>breakdown</strong> is separately Pending, In
          progress or Provided. Both can be changed straight from the list.
        </Step>

        <Step n={4} title="Say what happened">
          On a request, write in <strong>What just happened?</strong> and press <strong>Add update</strong>.
          That line becomes its Last update on the list, and the history keeps every change with who made it.
          Set <strong>Next action</strong> so the next person knows what is outstanding.
        </Step>

        <Step n={5} title="Work from the queues">
          The menu lists every view: Open, New, Currently sourcing, Breakdown pending,{" "}
          <strong>Breakdown ready</strong> and <strong>Sent to sales</strong>, each with a count.
          <strong> Mine only</strong> narrows a view to the requests assigned to you. Nobody has to ask which
          WhatsApp conversation a request was in.
        </Step>

        <Step n={6} title="Raising one from a lead">
          A lead&rsquo;s page has a <strong>Machine requests</strong> card. Press <strong>+ New request</strong>
          there and the phone, name, company and email come across by themselves — you only type the machine
          and what they need. Requests raised that way are listed on the lead too.
        </Step>

        {manager && (
          <Step n={7} title="The list of sources (admins)">
            <Link href="/settings/request-sources">Settings → Request sources</Link> is the{" "}
            <strong>Where did it come from?</strong> dropdown. Add your own, rename them and order them.
            Retiring one keeps it on the requests that already use it but takes it out of the dropdown.
          </Step>
        )}

        <Step n={manager ? 8 : 7} title="Being assigned tells you">
          Whoever is put on a request as procurement or sales gets it in their bell, and so does the sales
          person when a breakdown becomes ready.
        </Step>
      </div>
      )}

      <div className="card">
        <h2>Meetings</h2>

        <Step n={1} title="Schedule one and tag the people">
          <Link href="/meetings">Team → Meetings</Link> → <strong>+ Schedule a meeting</strong>. Give it a title,
          the date and time and how long, then tick everyone who should be there (or press{" "}
          <strong>Everyone</strong>). An agenda is optional.
        </Step>

        <Step n={2} title="The Google Meet room">
          The CRM creates the Google Meet room itself through Google&rsquo;s API when you save, and puts the
          meeting in everyone&rsquo;s Google Calendar — you never leave the CRM to set it up. This needs a Google
          account connected once under <strong>Settings → Google account</strong>; until then, paste a Meet link.
        </Step>

        <Step n={3} title="Everyone is told, and reminded">
          The people you tag get an email invite and a pop-up in the CRM. Ten minutes before it starts, everyone
          gets a reminder email and a pop-up with a <strong>Join Google Meet</strong> button. Press{" "}
          <strong>Turn on desktop reminders</strong> on the Meetings page to get it even when the CRM is in another tab.
        </Step>

        <Step n={4} title="Changing or cancelling">
          The organiser (or an admin) can <strong>Edit</strong> or <strong>Cancel meeting</strong> on its card;
          everyone in it is told. Today&rsquo;s meetings also show on <Link href="/work">My work</Link>.
        </Step>
      </div>

      <div className="card">
        <h2>Notifications and announcements</h2>

        <Step n={1} title="The bell">
          The bell at the top of the menu shows how many notifications you have not read — meeting invites, changes
          and reminders, announcements, machine requests assigned to you, and blockers you were tagged on. Click it
          for <Link href="/notifications">Notifications</Link>, where they all live. Click one to open what it is
          about; <strong>Mark all as read</strong> clears the bell.
        </Step>

        <Step n={2} title="On My work">
          <Link href="/work">My work</Link> shows only what is still waiting on you, in the column on the right.
          Everything older is on the Notifications page.
        </Step>

        <Step n={3} title="Announcements">
          <Link href="/announcements">Team → Announcements</Link> shows everything posted for you, newest first.
          {overseer && (
            <>
              {" "}
              To post one, press <strong>+ New announcement</strong>, write it, then choose <strong>@all</strong> for
              everyone on the CRM or <strong>Tag people</strong> for just some. Choose <strong>Post now</strong> or{" "}
              <strong>Schedule</strong> and a time. Everyone it reaches gets it in their bell and as a pop-up, and by
              email if <strong>Also email it to them</strong> is ticked. A scheduled one can be cancelled before it goes out.
            </>
          )}
        </Step>
      </div>

      {!md && (
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
      )}

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

          <Step n={5} title="Look back at any day, or at one person">
            Use <strong>← Previous day</strong> or the date box to see any day&rsquo;s sign-ins and
            reports. The table shows when each person first opened the CRM, when they signed in
            and out, how much they did on leads, and what they reported. Click a name for their
            full history: every daily report, every CRM sign-in, what they did on leads and what
            is on their board.
          </Step>
        </div>
      )}

      {blogger && (
        <div className="card">
          <h2>The blog</h2>

          <Step n={1} title="Write a post">
            <Link href="/blog/new">Blog → New post</Link>. Add a title and write in the editor — use
            H2 and H3 for sections, and the image button to add pictures (you will be asked for alt
            text). The URL is made from the title; change it under the title if you like.
          </Step>

          <Step n={2} title="Get the SEO score green">
            In the <strong>Rank Math SEO</strong> box, type the focus keyword, an SEO title and a
            meta description. The score updates as you write; open each section to see what to fix.
            Aim for 80 or more.
          </Step>

          <Step n={3} title="Categories, tags and featured image">
            Tick a category (or add a new one right there), add tags, and set a featured image.
            Manage the full list under <Link href="/blog/categories">Categories</Link>.
          </Step>

          <Step n={4} title="Publish, schedule or save a draft">
            <strong>Publish now</strong> puts it live on brandsquare.shop.{" "}
            <strong>Schedule for later</strong> picks a date and time (Nigeria time).{" "}
            <strong>Save draft</strong> keeps it private until it is ready.
          </Step>

          <Step n={5} title="See how posts perform">
            <Link href="/blog/analytics">Blog → Analytics</Link> ranks every post by views, readers,
            reading time, scroll depth and enquiries. Open a post&rsquo;s analytics for its daily
            views, where readers came from and the leads it produced.
          </Step>
        </div>
      )}

      <div className="card">
          <h2>Daily ads report</h2>

          <Step n={1} title="Check the website traffic">
            <Link href="/analytics">Traffic → Overview</Link>. Press <strong>24 hours</strong> for
            the last day, hour by hour: visitors, enquiries, the pages people landed on and{" "}
            <strong>where they came from</strong>. Ad visits show under their source and campaign
            name (for example facebook / machines-sept).
          </Step>

          {(manager || author || md) && (
            <Step n={2} title="See how each campaign is doing">
              <Link href="/campaigns">Leads → Campaigns</Link> lists every form with its leads, deals
              won and conversion rate. Open one to see how many of its leads are at each stage.
            </Step>
          )}

          <Step n={manager || author || md ? 3 : 2} title="See who the ads brought in">
            <Link href="/settings/meta">Meta → Ads</Link> shows how many lead and sale events Meta
            accepted, how many are waiting and how many it refused, with a 14-day chart. The table
            under it lists each person: name, phone, email, company, campaign, who owns the lead
            and the stage reported. If anything is refused, tell the super admin.
          </Step>

          <Step n={manager || author || md ? 4 : 3} title="Write the report">
            Put the 24-hour numbers in your daily report: visitors, enquiries, the top ad source and
            campaign, and anything refused by Meta. Spend, reach and cost per result are in Meta
            Ads Manager, not the CRM.
          </Step>

          {!superAdmin && (
            <p style={{ fontSize: 12.5, color: "var(--muted)", margin: "8px 0 0" }}>
              The Ads page is read-only for you. Connecting or changing ad datasets stays with the
              super admin.
            </p>
          )}
      </div>

      {!author && !md && (
        <div className="card">
          <h2>Response templates, FAQs and lead properties</h2>

          <Step n={1} title="Answer customers the same, good way">
            <Link href="/templates/responses">Templates → Response templates</Link> has a ready
            message for each situation. Type the customer&rsquo;s name and machine at the top, then
            press <strong>Copy</strong>. They are also in the WhatsApp inbox&rsquo;s{" "}
            <strong>Ready-made replies</strong> panel and a lead&rsquo;s email box.
          </Step>

          <Step n={2} title="Look up an answer">
            <Link href="/templates/faq">Templates → FAQs</Link> — search a word from the customer&rsquo;s
            question and copy the recommended answer.
          </Step>

          <Step n={3} title="Record your own details on a lead">
            On any lead, <strong>Properties → + Add a field</strong> adds a detail like Role or State
            for every lead, and <strong>Edit</strong> fills them in. When importing a spreadsheet,
            map a column to a property, or choose <em>New property</em> to create one from it.
          </Step>

          {manager && (
            <Step n={4} title="Keep them up to date (admins)">
              Settings has <strong>Response templates</strong>, <strong>FAQs</strong> and{" "}
              <strong>Lead properties</strong> to add, edit, reorder or remove them. Each page has
              step-by-step instructions at the top.
            </Step>
          )}
        </div>
      )}

      {!author && !md && (
      <div className="card">
        <h2>Quotations</h2>

        <Step n={1} title="Writing one">
          Press <strong>Quote</strong> at the top of a WhatsApp chat and it opens in front of the
          conversation, so you never leave the chat you are answering. On a lead, use{" "}
          <strong>+ New quotation</strong> on the Quotations card. Either way the customer's name and
          number are already filled in.
        </Step>

        <Step n={2} title="The figures are yours">
          There is no price list behind this. Write what you are quoting for, put the quantity and
          the unit price against it, and add as many lines as you need — the machine, spares,
          delivery, installation. The totals add up as you type. VAT starts at 7.5% and you can
          change it or set it to zero.
        </Step>

        <Step n={3} title="Sending it">
          Choose what goes: <strong>the document</strong>, a PDF with your logo that they can print
          or forward, <strong>the figures in the chat</strong> as a message, or both. It goes to
          them on WhatsApp and the quotation is marked Sent. <strong>Download the PDF</strong> gives
          you the same file to email yourself.
        </Step>

        <Step n={4} title="Afterwards">
          On <Link href="/quotes">Quotations</Link>, mark it <strong>Accepted</strong> or{" "}
          <strong>Declined</strong> when you hear back. Every quotation is listed there with who
          wrote it and what it came to, and each one also shows on its lead.
        </Step>
      </div>
      )}

      {!author && !md && (
      <div className="card">
        <h2>Email inbox</h2>

        <Step n={1} title="The company mailbox, in the CRM">
          <Link href="/mail">Leads → Email inbox</Link> shows the company Gmail mailbox the way the
          WhatsApp inbox shows WhatsApp: one shared list, newest first. New mail arrives by itself
          while the page is open, and <strong>Check now</strong> looks straight away. Mail you answer in
          Gmail itself shows up here too, and the other way round.
        </Step>

        <Step n={2} title="Reading and replying">
          Press a conversation to read it; the newest message is open and earlier ones are folded to a
          line. Pictures from the internet are hidden until you press <strong>Show pictures</strong>
          (they can tell the sender you opened it). Write in the box underneath, pick a template or
          response if it helps, attach files up to 20 MB in all, and press <strong>Send</strong>. It goes
          out from the company address, signed with your name.
        </Step>

        <Step n={3} title="Starting an email, and finding people">
          <strong>New email</strong> writes to anyone. The search box looks through names, subjects
          and the text of every message, and <strong>Unread</strong> and <strong>Not replied</strong> narrow
          the list. <strong>Not replied</strong> is people who wrote in and nobody here has answered yet.
        </Step>

        <Step n={4} title="From email to lead">
          A conversation shows whose lead it is, or <strong>Add to leads</strong> when the sender is not on
          file. If their address matches a lead already there, that lead is linked rather than a second
          one made. Use <strong>Select to add as leads</strong> to do several at once.
          {manager && (
            <>
              {" "}Admins can also <strong>Select conversations</strong> and remove them from the
              CRM&rsquo;s inbox. Nothing is deleted in Gmail, and a new message brings the conversation back.
            </>
          )}
        </Step>

        {superAdmin && (
          <Step n={5} title="The Google account behind it (super admin and IT officer)">
            Under <Link href="/meetings/settings">Settings → Google account</Link>. To use the
            organisation&rsquo;s own address instead of a personal one, type it, keep{" "}
            <strong>Also connect its email inbox</strong> ticked and press <strong>Change account</strong>.
            The old account is disconnected, its imported mail leaves the CRM (Gmail itself is untouched),
            and meetings already booked stay on its calendar. The same page sets how far back to bring in
            mail and whether the inbox is open to everyone allowed to send email or admins only &mdash; it
            is a whole mailbox, so limit it if it holds anything that is not customers. Bulk email
            campaigns send from the separate address under <Link href="/email/settings">Email → Sender
            settings</Link>.
          </Step>
        )}
      </div>
      )}

      {!author && !md && (
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

        <Step n={4} title="Spotting a new prospect">
          A conversation marked <strong>New</strong> in the list, or{" "}
          <strong>First contact</strong> at the top of the chat, is somebody who has written in and
          has never been answered by anyone here. The moment you reply, the flag goes.
        </Step>

        <Step n={5} title="Photos, documents and voice notes">
          Beside the message box there is a <strong>paperclip</strong> and a{" "}
          <strong>microphone</strong>. The paperclip sends a photo (JPG or PNG, up to 5 MB), an MP4
          video (up to 16 MB), or a PDF or Office document (up to 20 MB); you can add a caption
          before it goes. The microphone records a voice note — press it, speak, then{" "}
          <strong>Stop</strong>, and you can play it back before sending or throw it away. Whatever
          a customer sends you appears the same way, and photos and voice notes stay readable in the
          thread afterwards.
        </Step>

        <Step n={6} title="Fixing or removing a single message">
          Hold your mouse over a message and a pencil and a bin appear. The <strong>pencil</strong>
          edits a plain message you typed — not a photo's caption, not a template — and only shows
          up on your own side of the chat. This corrects the record here; WhatsApp has no way to
          change a message once it has reached someone, so their phone still shows exactly what you
          first sent. The <strong>bin</strong> removes any message, yours or theirs, from this
          screen — it becomes &ldquo;Message deleted&rdquo; the way WhatsApp&rsquo;s own app shows
          it, and a stored photo or voice note is properly deleted, not just hidden. Anyone with
          WhatsApp access can do both.
        </Step>

        <Step n={7} title="When the team works WhatsApp on the phone">
          At the top of the WhatsApp inbox, the <strong>Internal</strong> switch says where the team is
          working WhatsApp. While it is on, everything above applies. If the business moves to the
          ordinary WhatsApp Business app (which has no 24-hour rule), a super admin or the IT officer
          turns it off, and then: the <strong>WhatsApp</strong> button on a lead opens WhatsApp itself on
          a chat with that lead, with a greeting already typed that you can change before sending; this
          inbox becomes a <strong>read-only archive</strong> of everything said before, with{" "}
          <strong>Open in WhatsApp</strong> to carry a conversation on; and <strong>Chat history</strong>{" "}
          on a lead&rsquo;s page opens what was said here. Opening WhatsApp from a lead is noted in the
          lead&rsquo;s timeline, but what you then type on the phone is not recorded in the CRM.
        </Step>

        {manager && (
          <Step n={8} title="Deleting a conversation">
            Admins only, and it cannot be undone: every message, photo, voice note and document in
            that conversation goes, for everyone. Use <strong>Delete</strong> at the top of a
            conversation for one, or <strong>Select to delete</strong> above the list to tick
            several and remove them together. If that number writes again, a new conversation
            starts.
          </Step>
        )}

        {manager && (
          <Step n={9} title="Writing templates">
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
      )}

      {superAdmin && (
        <div className="card">
          <h2>Meta settings (super admin and IT officer)</h2>

          <Step n={1} title="WhatsApp settings — the connection">
            <Link href="/whatsapp/settings">WhatsApp settings</Link> holds the business number&rsquo;s
            IDs, the access token and the app secret. The token and secret are stored encrypted and
            are never shown again after saving — leave those boxes blank to keep what is saved. The
            box on the right says in one line whether messages are arriving, and why not if
            they aren&rsquo;t, with the last 20 calls from Meta underneath.
          </Step>

          <Step n="1b" title="WhatsApp on the phone, and the backup">
            Also in <Link href="/whatsapp/settings">WhatsApp settings</Link>: the business number the team
            uses on the phone and the greeting a lead&rsquo;s WhatsApp button starts a chat with. The{" "}
            <strong>Backup</strong> card keeps the history safe before the Meta account is detached:
            press <strong>Save files on this site now</strong> first (Meta only keeps customers&rsquo; photos
            and voice notes for about a month, so they have to be copied), then{" "}
            <strong>Download full backup</strong> for a zip with every chat as readable text, the files and
            a spreadsheet of all messages. WhatsApp cannot load an old conversation into the phone app, so
            the archive is how the history is kept.
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
