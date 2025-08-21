import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { adminAuth } from "@/lib/firebase/adminApp";
import clientPromise from "@/lib/db";

export async function verifyAdmin() {
  const sessionCookie = cookies().get("session")?.value;
  if (!sessionCookie) redirect("/login");

  try {
    const decodedToken = await adminAuth.verifySessionCookie(
      sessionCookie,
      true
    );

    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);
    const user = await db
      .collection("users")
      .findOne({ firebaseUid: decodedToken.uid });
      
    if (!user || user.role !== "admin") {
      throw new Error("Not an admin");
    }
    return { user };
  } catch (error) {
    redirect("/");
  }
}
