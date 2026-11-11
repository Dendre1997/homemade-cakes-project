import { getAppSettings } from "@/lib/api/settings";
import SettingsForm from "@/components/admin/SettingsForm";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await getAppSettings();

  return (
    <div className="mx-auto w-full max-w-4xl">
      <h1 className="mb-6 font-heading text-2xl font-bold tracking-tight text-primary text-balance sm:text-3xl">Global Settings</h1>
      <SettingsForm initialSettings={settings} />
    </div>
  );
}
