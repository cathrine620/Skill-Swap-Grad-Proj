import { connect } from "mongoose";

const connectionDB = async () => {
  const connection =
    process.env.CONNECTION || "mongodb://localhost:27017/skill-swap";

  try {
    await connect(connection, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log(`Database connected successfully`);
  } catch (error) {
    console.error("Database connection failed:", error);
  }
};

export default connectionDB;
