const { MongoClient } = require("mongodb");
const dotenv = require("dotenv");
const path = require("path");

// Завантажуємо змінні з файлу .env.local
dotenv.config({ path: path.resolve(__dirname, ".env.local") });

// Якщо не знайде в .env.local, спробуємо звичайний .env
if (!process.env.MONGODB_URI) {
  dotenv.config({ path: path.resolve(__dirname, ".env") });
}

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("⚠️  Error: MONGODB_URI is undefined.");
  console.error(
    "Make sure you have .env.local file in the root folder with MONGODB_URI inside."
  );
  process.exit(1);
}

async function seedAdmin() {
  console.log("🌱 Starting seeding process...");

  // У нових версіях драйвера опції useNewUrlParser більше не потрібні,
  // але якщо буде помилка - можна додати { useNewUrlParser: true } другим аргументом
  const client = new MongoClient(MONGODB_URI);

  try {
    await client.connect();
    console.log("✅ Connected to database");

    const db = client.db();
    const usersCollection = db.collection("users");

    // Твій старий адмін-користувач
    const adminUser = {
      email: "anastasiiadilna@gmail.com",
      role: "admin",
      firebaseUid: "4tGAuE3G6YdflymO9z6oXaWerBx2",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const existingUser = await usersCollection.findOne({
      email: adminUser.email,
    });

    if (existingUser) {
      console.log("⚠️  User already exists.");
      if (existingUser.role !== "admin") {
        await usersCollection.updateOne(
          { email: adminUser.email },
          { $set: { role: "admin" } }
        );
        console.log("🔄 Updated user to ADMIN role.");
      }
    } else {
      await usersCollection.insertOne(adminUser);
      console.log("🎉 Admin user created successfully!");
    }
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await client.close();
    console.log("👋 Connection closed");
  }
}

seedAdmin();
