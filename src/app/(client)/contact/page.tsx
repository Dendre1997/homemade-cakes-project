import { cookies } from "next/headers";
import { Suspense } from "react";
import { adminAuth } from "@/lib/firebase/adminApp";
import ContactClient from "../../../components/chat/ContactClient";
import { getAppSettings } from "@/lib/api/settings";
import { ErrorBoundary } from "react-error-boundary";
import ContactFallback from "./ContactFallback";
import LoadingSpinner from "@/components/ui/Spinner";

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
      <Suspense fallback={
        <div className="flex h-[60vh] items-center justify-center">
          <LoadingSpinner />
        </div>
      }>
        <ContactClient initialSettings={settings} isAuthenticated={isAuthenticated} />
      </Suspense>
    </ErrorBoundary>
  );
}
