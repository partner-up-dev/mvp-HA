/**
 * RPC Client Configuration
 *
 * We do not use traditional axios or fetch with manual wrapping.
 * Must create a type-safe client via the backend's exported AppType.
 */
import { hc } from "hono/client";
import type { AppType } from "@partner-up-dev/backend";

export const API_URL = import.meta.env.VITE_API_URL || "";

export const client = hc<AppType>(API_URL);
