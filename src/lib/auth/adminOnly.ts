import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuth } from "@/lib/firebase/adminApp";
import clientPromise from "@/lib/db";

export async function verifyAdmin() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("admin_session")?.value;
  if (!sessionCookie) redirect("/bakery-manufacturing-orders/login");

  try {
    const decodedToken = await adminAuth.verifySessionCookie(
      sessionCookie,
      true
    );

    if (decodedToken.admin === true) {
      return { user: { role: "admin", firebaseUid: decodedToken.uid } };
    }

    throw new Error("Not an admin");
  } catch (error) {
    redirect("/bakery-manufacturing-orders/login");
  }
}

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
