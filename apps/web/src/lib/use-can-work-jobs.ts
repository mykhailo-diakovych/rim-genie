import { authClient } from "./auth-client";

// Managers only oversee the technician screen; technicianProcedure on the server guards the writes.
export function useCanWorkJobs(): boolean {
  const { data: session } = authClient.useSession();
  const role = session?.user.role;
  return role === "admin" || role === "technician";
}
