
import { db } from "./index";
import * as schema from "@shared/schema";
import { eq } from "drizzle-orm";

async function seed() {
  try {
    // Clear existing data
    await db.delete(schema.mqttRules);
    await db.delete(schema.mqttMessages);
    await db.delete(schema.users);

    // Create test user
    const [user] = await db.insert(schema.users).values({
      username: "test",
      password: "test123" // In production use hashed passwords
    }).returning();

    // Create sample rules
    await db.insert(schema.mqttRules).values([
      {
        name: "Temperature Alert",
        topic: "sensors/temperature",
        condition: "value > 30",
        action: "notify",
        userId: user.id,
        isActive: true
      }
    ]);

    console.log("✅ Database seeded successfully");
  } catch (error) {
    console.error("❌ Error seeding database:", error);
  } finally {
    process.exit(0);
  }
}

seed();
