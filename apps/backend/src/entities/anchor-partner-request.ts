import { z } from "zod";

export const anchorLocationSourceSchema = z.enum(["SYSTEM", "USER"]);
export type AnchorLocationSource = z.infer<typeof anchorLocationSourceSchema>;
