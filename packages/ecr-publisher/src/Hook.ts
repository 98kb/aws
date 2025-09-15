import type {Context} from "./Context";

export type Hook = (context: Context) => Promise<Context> | Context;
