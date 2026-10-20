import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuth } from "@/lib/firebase/adminApp";
import clientPromise from "@/lib/db";

/**
 * Fallback for sessions minted before the `admin` custom claim was set:
 * the session cookie keeps the claims it was created with.
 */
async function isMongoAdmin(firebaseUid: string): Promise<boolean> {
  const client = await clientPromise;
  const db = client.db(process.env.MONGODB_DB_NAME);
  const user = await db
    .collection("users")
    .findOne(
      { firebaseUid, role: "admin" },
      { projection: { _id: 1 } }
    );
  return user !== null;
}

// Page/layout renders only: signature is verified locally against cached certs.
// Revocation is still enforced by verifyAdminAPI on every API route / mutation.
export const verifyAdmin = cache(async () => {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("admin_session")?.value;
  if (!sessionCookie) redirect("/bakery-manufacturing-orders/login");

  let isAdmin = false;
  let firebaseUid = "";
  try {
    const decodedToken = await adminAuth.verifySessionCookie(
      sessionCookie,
      false
    );
    firebaseUid = decodedToken.uid;
    isAdmin =
      decodedToken.admin === true || (await isMongoAdmin(decodedToken.uid));
  } catch {
    isAdmin = false;
  }

  // redirect() throws, so it must stay outside the try/catch above.
  if (!isAdmin) redirect("/bakery-manufacturing-orders/login");

  return { user: { role: "admin", firebaseUid } };
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

    if (
      decodedToken.admin === true ||
      (await isMongoAdmin(decodedToken.uid))
    ) {
      return { user: { role: "admin", firebaseUid: decodedToken.uid } };
    }

    return { error: "Forbidden", status: 403 };
  } catch (error) {
    return { error: "Unauthorized", status: 401 };
  }
}
