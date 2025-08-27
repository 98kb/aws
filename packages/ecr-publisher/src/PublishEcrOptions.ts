import type z from "zod";
import type {publishEcrOptionsSchema} from "./publishEcrOptionsSchema";

export type PublishEcrOptions = z.infer<typeof publishEcrOptionsSchema>;
