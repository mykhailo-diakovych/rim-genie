import { authClient } from "./auth-client";

// UI affordance only — priceAdjustProcedure on the server guards the actual write.
export function useCanAdjustPrices(): boolean {
  const { data: session } = authClient.useSession();
  if (!session?.user) return false;
  return session.user.role === "admin" || session.user.canAdjustPrices === true;
}
