import dotenv from "dotenv";
import mongoose from "mongoose";
import HealthRecord from "./models/HealthRecord";
import User from "./models/User";
import Hospital from "./models/Hospital";
import { generateDemoRecords } from "./utils/demoData";
import { MOCK_USERS } from "./utils/mockUsers";

dotenv.config();

async function runSeeder() {
  const mongodbUri = process.env.MONGODB_URI;

  if (!mongodbUri) {
    console.error("❌ Error: MONGODB_URI environment variable is not defined.");
    process.exit(1);
  }

  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(mongodbUri);
    console.log("✅ Connected to MongoDB");

    console.log("📊 Generating professional demo records...");
    const demoRecords = generateDemoRecords();
    const patientIds = Array.from(new Set(demoRecords.map((r) => r.patientId)));

    console.log(`🧹 Cleaning up existing records for seeded patients: ${patientIds.join(", ")}...`);
    const deleteResult = await HealthRecord.deleteMany({
      patientId: { $in: patientIds },
    });
    console.log(`✅ Deleted ${deleteResult.deletedCount} old health records.`);

    console.log(`🌱 Seeding ${demoRecords.length} new health records...`);
    const insertResult = await HealthRecord.insertMany(demoRecords);
    console.log(`✅ Successfully seeded ${insertResult.length} health records!`);

    console.log("🧹 Cleaning up existing hospitals...");
    await Hospital.deleteMany({ hospitalId: "HOSP-001" });

    console.log("🌱 Seeding demo hospital...");
    await Hospital.create({
      hospitalId: "HOSP-001",
      hospitalName: "MediFlow Hospital",
      address: "123 Healthcare Ave",
      city: "Metro City",
      state: "State",
      country: "Country",
      pincode: "123456",
      phone: "+15550199",
      email: "info@mediflowhospital.com",
      website: "https://mediflowhospital.com",
      logo: "https://mediflowhospital.com/logo.png",
      status: "active",
    });
    console.log("✅ Demo hospital seeded successfully!");

    console.log("🧹 Cleaning up existing users...");
    const userUsernames = MOCK_USERS.map((u) => u.username);
    await User.deleteMany({ username: { $in: userUsernames } });

    console.log("🌱 Seeding user accounts...");
    const usersToInsert = MOCK_USERS.map((u) => ({
      username: u.username,
      password: u.passwordHash,
      role: u.role,
      patientId: u.patientId || null,
      hospitalId: "HOSP-001",
    }));
    const userInsertResult = await User.insertMany(usersToInsert);
    console.log(`✅ Successfully seeded ${userInsertResult.length} users!`);

    console.log("🎉 Seeding completed successfully!");
  } catch (error) {
    console.error("❌ Seeding failed with an error:", error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB.");
    process.exit(0);
  }
}

runSeeder();
