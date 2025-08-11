/* eslint-disable no-console */
import {exec, spawn} from "node:child_process";
import {promisify} from "node:util";
import {findMonorepoRoot} from "./findMonorepoRoot";
import type {Options} from "./Options";

const execAsync = promisify(exec);

/**
 * Builds a Docker image using the specified Docker arguments and tags it with the provided version
 * The build context can be specified in options, defaults to monorepo root if not provided
 * Dockerfile path should be specified in dockerArgs using -f or --file flag
 * @param opts - Build options including repo, context, and docker arguments
 * @param version - Version tag for the image
 * @returns Promise<string> - The image tag of the built image
 */
export async function buildDockerImage(
  opts: Options,
  version: string,
): Promise<string> {
  await checkDockerAvailability();

  const {buildContext, imageTag} = prepareBuildContext(opts, version);
  logBuildInfo(opts.repo, version);

  const buildArgs = createDockerBuildCommand({
    imageTag,
    buildContext,
    version,
    dockerArgs: opts.dockerArgs,
  });
  await executeBuild(opts, buildArgs);
  console.log(`✅ Successfully built Docker image: ${imageTag}`);
  return imageTag;
}

async function checkDockerAvailability(): Promise<void> {
  try {
    await execAsync("docker --version");
  } catch (error: unknown) {
    handleDockerError(error);
  }
}

function prepareBuildContext(opts: Options, version: string) {
  // Use provided context or fall back to monorepo root
  const buildContext = opts.context || findMonorepoRoot();
  const imageTag = `${opts.repo}:${version}`;
  console.log(`📁 Using build context: ${buildContext}`);
  return {buildContext, imageTag};
}

function logBuildInfo(repoName: string, version: string): void {
  console.log(`🏗️  Building Docker image`);
  console.log(`📦 Repository: ${repoName}`);
  console.log(`🏷️  Tag: ${version}`);
}

function createDockerBuildCommand({
  imageTag,
  buildContext,
  version,
  dockerArgs,
}: {
  imageTag: string;
  buildContext: string;
  version: string;
  dockerArgs?: string[];
}): string {
  const baseArgs = [
    "docker build",
    `-t ${imageTag}`,
    `--label version=${version}`,
    `--label built-at=${new Date().toISOString()}`,
  ];

  // Add custom docker arguments if provided
  if (dockerArgs && dockerArgs.length > 0) {
    baseArgs.push(...dockerArgs);
  }

  // Add build context last
  baseArgs.push(buildContext);

  return baseArgs.join(" ");
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

async function executeBuild(opts: Options, buildArgs: string): Promise<void> {
  console.log(`🔨 Running: ${buildArgs}`);
  if (opts.dryRun) {
    console.log("🔍 Dry run enabled, skipping actual build.");
    return;
  }
  return new Promise((resolve, reject) => {
    // Parse the command and arguments
    const args = buildArgs.split(" ");
    const command = args[0];
    const commandArgs = args.slice(1);

    const dockerProcess = spawn(command, commandArgs, {
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
