import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const getRoleForIdentity = async (ctx: any) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }

  const currentUser = await ctx.db
    .query("users")
    .withIndex("by_clerkId", (q: any) => q.eq("clerkId", identity.subject))
    .unique();

  if (!currentUser) {
    throw new Error("User record not found");
  }

  return { role: currentUser.role, clerkId: identity.subject };
};

const makePublicId = () => {
  return Math.random().toString(36).slice(2, 10);
};

export const createTournament = mutation({
  args: {
    name: v.string(),
    data: v.any(),
    visibility: v.union(v.literal("public"), v.literal("private")),
  },
  handler: async (ctx, args) => {
    const { role, clerkId } = await getRoleForIdentity(ctx);
    if (role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    const publicId = makePublicId();
    const now = Date.now();

    const tournamentId = await ctx.db.insert("tournaments", {
      name: args.name,
      nameLower: args.name.toLowerCase(),
      ownerClerkId: clerkId,
      publicId,
      visibility: args.visibility,
      data: args.data,
      createdAt: now,
      updatedAt: now,
    });

    return { id: tournamentId, publicId };
  },
});

export const updateTournament = mutation({
  args: {
    id: v.id("tournaments"),
    name: v.optional(v.string()),
    data: v.optional(v.any()),
    visibility: v.optional(v.union(v.literal("public"), v.literal("private"))),
  },
  handler: async (ctx, args) => {
    const { role } = await getRoleForIdentity(ctx);
    if (role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    const patch: Record<string, any> = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) {
      patch.name = args.name;
      patch.nameLower = args.name.toLowerCase();
    }
    if (args.data !== undefined) patch.data = args.data;
    if (args.visibility !== undefined) patch.visibility = args.visibility;

    await ctx.db.patch(args.id, patch);
    return args.id;
  },
});

export const deleteTournament = mutation({
  args: { id: v.id("tournaments") },
  handler: async (ctx, args) => {
    const { role } = await getRoleForIdentity(ctx);
    if (role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }
    await ctx.db.delete(args.id);
    return true;
  },
});

export const listPublicTournaments = query({
  args: { search: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const tournaments = await ctx.db
      .query("tournaments")
      .withIndex("by_visibility", (q) => q.eq("visibility", "public"))
      .collect();

    const search = args.search?.trim().toLowerCase();
    if (!search) {
      return tournaments.sort((a, b) => b.createdAt - a.createdAt);
    }

    return tournaments
      .filter((t) => t.nameLower.includes(search))
      .sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const listAllTournaments = query({
  args: {},
  handler: async (ctx) => {
    const { role } = await getRoleForIdentity(ctx);
    if (role !== "admin") {
      throw new Error("Unauthorized: Admin access required");
    }

    return await ctx.db.query("tournaments").collect();
  },
});

export const getTournamentByPublicId = query({
  args: { publicId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tournaments")
      .withIndex("by_publicId", (q) => q.eq("publicId", args.publicId))
      .unique();
  },
});
