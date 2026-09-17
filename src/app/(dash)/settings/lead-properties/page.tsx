import { requireAdmin } from "@/lib/auth";
import { getLeadProperties } from "@/lib/queries";
import HowTo from "../../templates/how-to";
import PropertiesEditor from "./editor";

export default async function LeadPropertiesPage() {
  await requireAdmin();
  const properties = await getLeadProperties();

  return (
    <>
      <div className="head">
        <h1>Lead properties</h1>
      </div>

      <HowTo
        title="Lead properties"
        steps={[
          {
            title: "Add the details you track",
            body: <>Press <strong>+ Add a property</strong> for anything beyond name, email and phone — Role, State, Machine interest, Budget.</>,
          },
          {
            title: "Pick the kind of answer",
            body: <>Short text for most things, a <strong>Dropdown</strong> when there is a fixed list (type the choices separated by commas), or number, date, phone, email or web address.</>,
          },
          {
            title: "Choose what shows in the leads list",
            body: <>Tick <strong>Show in leads list</strong> to add it as a column. Every property shows on the lead&rsquo;s own page and in exports either way.</>,
          },
          {
            title: "Save",
            body: <>Press <strong>Save properties</strong>. They appear on every lead straight away, to fill in or edit.</>,
          },
          {
            title: "Map them when importing",
            body: <>In <strong>Leads → Import</strong>, set a column&rsquo;s <em>Maps to</em> to a property — or to <em>New property</em> to create one from that column on the spot.</>,
          },
        ]}
      />

      <PropertiesEditor initial={properties} />
    </>
  );
}
