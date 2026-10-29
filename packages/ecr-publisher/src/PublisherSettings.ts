import type {CommandRunner} from "./CommandRunner";
import type {ConfirmFn} from "./ConfirmFn";
import type {CreateRepoPolicy} from "./CreateRepoPolicy";

export type * from "./CommandRunner";
export type * from "./ConfirmFn";
export type * from "./ConfirmStepName";
export type * from "./CreateRepoPolicy";

export type PublisherSettings = {
  confirm?: ConfirmFn;
  yes?: boolean;
  interactive?: boolean;
  createRepo?: CreateRepoPolicy;
  /** Runs every Docker command (build, login, tag, push). */
  runner?: CommandRunner;
};
