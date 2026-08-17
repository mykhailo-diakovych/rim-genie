// Re-exported so password hashing goes through Better Auth's own implementation.
// Anything written here must match what `/sign-in/username` verifies against.
export { verifyPassword, hashPassword } from "better-auth/crypto";
