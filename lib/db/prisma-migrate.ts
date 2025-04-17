import { PrismaClient } from "@prisma/client";

// This script can be used for migrations and database setup
async function main() {
  const prisma = new PrismaClient();

  try {
    console.log("Checking database connection...");
    await prisma.$connect();
    console.log("Database connection successful!");

    // Here you can add any custom migration logic if needed

    console.log("Migration complete!");
  } catch (error) {
    console.error("Error during migration:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
