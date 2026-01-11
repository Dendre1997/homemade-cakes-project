import clientPromise from "@/lib/db";
import { config } from "dotenv";

config({ path: ".env.local" });

async function checkSlides() {
  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB_NAME);
    const count = await db.collection("hero_slides").countDocuments();
    console.log(`Hero slides count: ${count}`);
    
    if (count > 0) {
      const slides = await db.collection("hero_slides").find({}).toArray();
      console.log("Slides:", JSON.stringify(slides, null, 2));
    }
  } catch (error) {
    console.error("Error checking slides:", error);
  } finally {
    process.exit(0);
  }
}

checkSlides();
