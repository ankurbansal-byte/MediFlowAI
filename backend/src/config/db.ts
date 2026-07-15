import mongoose from "mongoose";

const connectDB = async () => {
  if (!process.env.MONGODB_URI) {
    console.warn("⚠️ MONGODB_URI is undefined. Running backend with mock fallback data!");
    process.env.USE_MOCK_DATA = "true";
    return;
  }

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB Connected");
  } catch (error) {
    console.error("❌ MongoDB Connection Error:", error);
    console.warn("⚠️ Running backend with mock fallback data!");
    process.env.USE_MOCK_DATA = "true";
  }
};

export default connectDB;