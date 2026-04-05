import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../entities";
import { env } from "./env";

const client = postgres(env.DATABASE_URL, {
  connect_timeout: env.DB_CONNECT_TIMEOUT_SECONDS,
});
export const db = drizzle(client, { schema });
