import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuth } from "@/lib/firebase/adminApp";
import clientPromise from "@/lib/db";

// Page/layout renders only: signature is verified locally against cached certs.
// Revocation is still enforced by verifyAdminAPI on every API route / mutation.
export const verifyAdmin = cache(async () => {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("admin_session")?.value;
  if (!sessionCookie) redirect("/bakery-manufacturing-orders/login");

  try {
    const decodedToken = await adminAuth.verifySessionCookie(
      sessionCookie,
      false
    );

    if (decodedToken.admin === true) {
      return { user: { role: "admin", firebaseUid: decodedToken.uid } };
    }

    throw new Error("Not an admin");
  } catch (error) {
    redirect("/bakery-manufacturing-orders/login");
  }
});

export async function verifyAdminAPI() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("admin_session")?.value;
  if (!sessionCookie) {
    return { error: "Unauthorized", status: 401 };
  }

  try {
    const decodedToken = await adminAuth.verifySessionCookie(
      sessionCookie,
      true
    );

    if (decodedToken.admin === true) {
      return { user: { role: "admin", firebaseUid: decodedToken.uid } };
    }

    return { error: "Forbidden", status: 403 };
  } catch (error) {
    return { error: "Unauthorized", status: 401 };
  }
}
