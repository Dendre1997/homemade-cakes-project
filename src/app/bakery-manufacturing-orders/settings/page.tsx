import { getAppSettings } from "@/lib/api/settings";
import SettingsForm from "@/components/admin/SettingsForm";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await getAppSettings();

  return (
    <div className="container mx-auto py-10 max-w-4xl px-6">
      <h1 className="text-3xl font-bold mb-6 text-primary">Global Settings</h1>
      <SettingsForm initialSettings={settings} />
    </div>
  );
}
