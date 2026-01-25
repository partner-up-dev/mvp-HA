/**
 * RPC Client Configuration
 *
 * We do not use traditional axios or fetch with manual wrapping.
 * Must create a type-safe client via the backend's exported AppType.
 * Supports mock mode for development without backend.
 */
import { hc } from "hono/client";
import type { AppType } from "@partner-up-dev/backend";
import { mockClient } from "./mock-rpc";

const API_URL = import.meta.env.VITE_API_URL || "";
const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

export const client = USE_MOCK ? mockClient : hc<AppType>(API_URL);
