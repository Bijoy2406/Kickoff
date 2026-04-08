import { mutation, query } from "./_generated/server";

/**
 * Stores or updates a user in the database when they authenticate via Clerk.
 * - Creates new user if clerkId doesn't exist
 * - Updates existing user's name/email if they already exist
 * - Sets role to 'admin' if JWT contains admin claim, otherwise 'user'
 */
export const storeUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    // LOOK HERE: Accessing the role from your Clerk claim
    const role = (identity.role as string) ?? "user";

    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        name: identity.name ?? "Unknown",
        email: identity.email ?? "",
        role, // Updates role if you changed it in Clerk
      });
      return existingUser._id;
    }

    return await ctx.db.insert("users", {
      name: identity.name ?? "Unknown",
      email: identity.email ?? "",
      clerkId: identity.subject,
      role,
    });
  },
});

/**
 * Lists all users in the database.
 * Security: Only accessible by admin users.
 */
export const listAllUsers = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Get current user to check their role
    const currentUser = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();

    if (!currentUser || currentUser.role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    // Return all users
    return await ctx.db.query("users").collect();
  },
});

/**
 * Gets the current authenticated user's data.
 */
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      return null;
    }

    return await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
      .unique();
  },
});
