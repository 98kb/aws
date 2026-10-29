import type {CommandRunner} from "./CommandRunner";
import type {ConfirmFn} from "./ConfirmFn";
import type {CreateRepoPolicy} from "./CreateRepoPolicy";
import {defaultRunner} from "./defaultRunner";
import type {PublisherSettings} from "./PublisherSettings";

export type ResolvedPublisherSettings = {
  confirm?: ConfirmFn;
  yes: boolean;
  interactive: boolean;
  createRepo: CreateRepoPolicy;
  runner: CommandRunner;
};

const defaults: ResolvedPublisherSettings = {
  yes: false,
  interactive: true,
  createRepo: "prompt",
  runner: defaultRunner,
};

export function normalizePublisherSettings(
  settings: PublisherSettings = {},
): ResolvedPublisherSettings {
  const provided = Object.entries(settings).filter(
    ([, value]) => value !== undefined,
  );
  return {...defaults, ...Object.fromEntries(provided)};
}
