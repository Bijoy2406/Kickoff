import { useEffect } from "react";
import { useConvexAuth, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

/**
 * UserHandler Component
 * 
 * Automatically syncs authenticated Clerk users to the Convex database.
 * This component should be placed inside both ClerkProvider and ConvexProviderWithClerk.
 * It renders nothing visible - it only handles the sync logic.
 */
export function UserHandler() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const storeUser = useMutation(api.users.storeUser);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      // User is authenticated, sync to Convex
      storeUser()
        .then(() => {
          console.log("User synced to Convex");
        })
        .catch((error) => {
          console.error("Failed to sync user to Convex:", error);
        });
    }
  }, [isAuthenticated, isLoading, storeUser]);

  // This component doesn't render anything
  return null;
}
