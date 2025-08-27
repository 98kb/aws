/* eslint-disable no-console */
import {spawn} from "child_process";

export async function executeCommand(command: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const dockerProcess = spawn(command, {
      stdio: "inherit", // This will stream output directly to console
      shell: true,
    });

    dockerProcess.on("close", code => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Docker build failed with exit code ${code}`));
      }
    });

    dockerProcess.on("error", error => {
      handleDockerError(error);
    });
  });
}

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
    error.message.includes("docker: not found")
  );
}

function printDockerPermissionHelp(): void {
  const messages = [
    "❌ Docker permission error detected!",
    "\n🔧 To fix this issue, try one of the following:\n",
    "1. Add your user to the docker group:",
    "   sudo usermod -aG docker $USER",
    "   newgrp docker",
    "\n2. Or run with sudo:",
    `   sudo ${process.argv.join(" ")}`,
    "\n3. Make sure Docker daemon is running:",
    "   sudo systemctl start docker",
    "\n4. Check Docker socket permissions:",
    "   sudo chmod 666 /var/run/docker.sock",
  ];
  messages.forEach(msg => console.error(msg));
}

function printDockerNotFoundHelp(): void {
  console.error("❌ Docker is not installed or not in PATH!");
  console.error("\n🔧 Install Docker:");
  console.error("   Visit: https://docs.docker.com/engine/install/");
}

function handlePermissionError(): never {
  printDockerPermissionHelp();
  throw new Error("Docker permission denied. See suggestions above.");
}

function handleNotFoundError(): never {
  printDockerNotFoundHelp();
  throw new Error("Docker not found. Please install Docker.");
}

function handleDockerError(error: unknown): never {
  const err = error as Error;

  if (isDockerPermissionError(err)) {
    handlePermissionError();
  }

  if (isDockerNotFoundError(err)) {
    handleNotFoundError();
  }

  throw error;
}
