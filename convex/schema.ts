import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    name: v.string(),
    email: v.string(),
    clerkId: v.string(),
    role: v.union(v.literal("admin"), v.literal("user")),
  }).index("by_clerkId", ["clerkId"]),
  tournaments: defineTable({
    name: v.string(),
    nameLower: v.string(),
    ownerClerkId: v.string(),
    publicId: v.string(),
    visibility: v.union(v.literal("public"), v.literal("private")),
    data: v.any(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_publicId", ["publicId"])
    .index("by_ownerClerkId", ["ownerClerkId"])
    .index("by_visibility", ["visibility"]),
});
