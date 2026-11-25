import { db } from "./index";
import { vaults } from "./schema";

async function testConnection() {
  try {
    console.log("Testing connection to PostgreSQL via Bun...");

    const result = await db.select().from(vaults).limit(1);

    console.log("Successfully connected to PostgreSQL database!");
    console.log("Query result preview:", result);
    process.exit(0);
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }
}

testConnection();
