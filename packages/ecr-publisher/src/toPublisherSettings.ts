import type {CreateRepoPolicy} from "./CreateRepoPolicy";
import type {PublisherSettings} from "./PublisherSettings";

export type CliSettingsFlags = {
  yes?: boolean;
  nonInteractive?: boolean;
  createRepo?: CreateRepoPolicy;
};

export function toPublisherSettings(
  flags: CliSettingsFlags,
): Required<Pick<PublisherSettings, "yes" | "interactive" | "createRepo">> {
  return {
    yes: flags.yes ?? false,
    interactive: !flags.nonInteractive,
    createRepo: flags.createRepo ?? "prompt",
  };
}
