import ContactClient from "../../../components/chat/ContactClient";
import { getAppSettings } from "@/lib/api/settings";

export default async function ContactPage() {
  const settings = await getAppSettings();

  return <ContactClient initialSettings={settings} />;
}
