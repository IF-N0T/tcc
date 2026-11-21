import { assertJwtSecret } from "./lib/auth";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") assertJwtSecret();
}
