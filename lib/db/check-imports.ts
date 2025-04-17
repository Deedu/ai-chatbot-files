import { PrismaClient } from "@prisma/client";
import { getUser } from "./queries";

// This script verifies that our Prisma setup is working correctly
async function checkPrisma() {
  console.log("Checking Prisma setup...");

  // Check PrismaClient import
  const prisma = new PrismaClient();
  console.log("✅ PrismaClient successfully imported");

  console.log("✅ Query functions successfully imported");

  // Try to execute a simple query
  try {
    await prisma.$connect();
    console.log("✅ Database connection successful");

    // Try a simple query
    const userCount = await prisma.user.count();
    console.log(`✅ Query successful - User count: ${userCount}`);

    // Try using one of our functions
    const users = await getUser("test@example.com");
    console.log(`✅ Custom query function works - Found ${users.length} users`);

    // Disconnect when done
    await prisma.$disconnect();
  } catch (error) {
    console.error("❌ Error:", error);
  }

  console.log("Prisma check complete!");
}

// Only run if executed directly
if (require.main === module) {
  checkPrisma().catch((error) => {
    console.error("Error during Prisma check:", error);
    process.exit(1);
  });
}
