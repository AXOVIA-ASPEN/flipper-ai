/**
 * NextAuth.js API Route Handler
 * Handles all authentication requests (signin, signout, callback, etc.)
 */

import { handlers } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const { GET, POST } = handlers;
