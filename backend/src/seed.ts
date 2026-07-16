import dotenv from "dotenv";
import mongoose from "mongoose";
import HealthRecord from "./models/HealthRecord";
import { generateDemoRecords } from "./utils/demoData";

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
