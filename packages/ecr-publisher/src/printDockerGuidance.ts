import {printDockerNotFoundHelp} from "./printDockerNotFoundHelp";
import {printDockerPermissionHelp} from "./printDockerPermissionHelp";

const guidanceByCode: Record<string, () => void> = {
  ENOENT: printDockerNotFoundHelp,
  EACCES: printDockerPermissionHelp,
};

/** Prints Docker setup help for a spawn error code. Never throws. */
export function printDockerGuidance(errorCode?: string): void {
  if (errorCode && Object.hasOwn(guidanceByCode, errorCode)) {
    guidanceByCode[errorCode]();
  }
}
