import type {ConfirmFn} from "./ConfirmFn";
import type {CreateRepoPolicy} from "./CreateRepoPolicy";

export type * from "./ConfirmFn";
export type * from "./ConfirmStepName";
export type * from "./CreateRepoPolicy";

export type PublisherSettings = {
  confirm?: ConfirmFn;
  yes?: boolean;
  interactive?: boolean;
  createRepo?: CreateRepoPolicy;
};
