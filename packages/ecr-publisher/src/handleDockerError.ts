import {printDockerNotFoundHelp} from "./printDockerNotFoundHelp";
import {printDockerPermissionHelp} from "./printDockerPermissionHelp";

function isDockerPermissionError(error: Error): boolean {
  return (
    error.message.includes("permission denied") ||
    error.message.includes("dial unix /var/run/docker.sock") ||
    error.message.includes("Cannot connect to the Docker daemon")
  );
}

function isDockerNotFoundError(error: Error): boolean {
  return (
    error.message.includes("command not found") ||
    error.message.includes("docker: not found") ||
    error.message.includes(
      "is not recognized as an internal or external command",
    )
  );
}

function handlePermissionError(): never {
  printDockerPermissionHelp();
  throw new Error("Docker permission denied. See suggestions above.");
}

function handleNotFoundError(): never {
  printDockerNotFoundHelp();
  throw new Error("Docker not found. Please install Docker.");
}

export function handleDockerError(error: unknown): never {
  const err = error as Error;

  if (isDockerPermissionError(err)) {
    handlePermissionError();
  }

  if (isDockerNotFoundError(err)) {
    handleNotFoundError();
  }

  throw error;
}
