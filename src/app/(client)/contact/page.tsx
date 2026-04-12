import { cookies } from "next/headers";
import { adminAuth } from "@/lib/firebase/adminApp";
import ContactClient from "../../../components/chat/ContactClient";
import { getAppSettings } from "@/lib/api/settings";
import { ErrorBoundary } from "react-error-boundary";
import ContactFallback from "./ContactFallback";

export default async function ContactPage() {
  const settings = await getAppSettings();
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("session")?.value;

  let isAuthenticated = false;
  if (sessionCookie) {
    try {
      await adminAuth.verifySessionCookie(sessionCookie, true);
      isAuthenticated = true;
    } catch (e) {
      isAuthenticated = false;
    }
  }

  return (
    <ErrorBoundary FallbackComponent={ContactFallback}>
      <ContactClient initialSettings={settings} isAuthenticated={isAuthenticated} />
    </ErrorBoundary>
  );
}
