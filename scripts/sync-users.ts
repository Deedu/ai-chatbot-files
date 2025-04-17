import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";

// Initialize Prisma client
const prisma = new PrismaClient();

// Initialize Supabase admin client (requires service role key)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || ""
);

async function syncUsers() {
  try {
    console.log("Starting user synchronization...");

    // Get all users from Supabase
    const { data: supabaseUsers, error } =
      await supabase.auth.admin.listUsers();

    if (error) {
      throw error;
    }

    console.log(`Found ${supabaseUsers.users.length} users in Supabase`);

    // Sync each user to the Prisma database
    for (const user of supabaseUsers.users) {
      if (!user.email) {
        console.warn(`User ${user.id} has no email, skipping`);
        continue;
      }

      // Check if user exists in Prisma
      const existingUser = await prisma.user.findUnique({
        where: { id: user.id },
      });

      if (!existingUser) {
        // Create user in Prisma
        await prisma.user.create({
          data: {
            id: user.id,
            email: user.email,
          },
        });
        console.log(
          `Created user ${user.id} (${user.email}) in Prisma database`
        );
      } else {
        console.log(
          `User ${user.id} (${user.email}) already exists in Prisma database`
        );
      }
    }

    console.log("User synchronization completed successfully");
  } catch (error) {
    console.error("Error synchronizing users:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the sync function
syncUsers();
