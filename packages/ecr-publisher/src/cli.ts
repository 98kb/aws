/* eslint-disable no-console */
import {ECRClient} from "@aws-sdk/client-ecr";
import {ECRPUBLICClient} from "@aws-sdk/client-ecr-public";
import type {PublishEcrOptions} from "./PublishEcrOptions";
import type {PublisherSettings} from "./PublisherSettings";
import {createEcrPublisher} from "./createEcrPublisher";
import {createPublicEcrPublisher} from "./createPublicEcrPublisher";
import chalk from "chalk";
import {publishEcrOptionsSchema} from "./publishEcrOptionsSchema";
import {Command, Option} from "commander";
import {
  type CliSettingsFlags,
  toPublisherSettings,
} from "./toPublisherSettings";
import {exitCodeFor} from "./exitCodeFor";
import {isEcrPublisherError} from "./isEcrPublisherError";

export function cli() {
  return new Command()
    .name("ecr-publisher")
    .description(
      `${chalk.magenta("Build")}, ${chalk.blue("version")}, and ${chalk.hex("#00FF00")("publish")} docker images to Amazon ECR`,
    )
    .requiredOption("-r, --repo <name>", "ECR repository name")
    .option("--bump <type>", "Bump type (major, minor, patch)", "minor")
    .option("--region <region>", "AWS region")
    .option(
      "--docker-args <args...>",
      "Additional docker build arguments (e.g., --docker-args -f Dockerfile --build-arg NODE_ENV=production)",
      [],
    )
    .option("--public", "Use public ECR repository", false)
    .option(
      "--alias <alias>",
      "Public ECR registry alias (auto-detected if omitted)",
    )
    .option("--yes", "Auto-approve the build and push prompts", false)
    .option(
      "--non-interactive",
      "Never prompt; requires --yes to approve build and push",
      false,
    )
    .addOption(
      new Option(
        "--create-repo <policy>",
        "What to do when the repository is missing",
      )
        .choices(["prompt", "always", "never"])
        .default("prompt"),
    )
    .action(runPublish);
}

async function runPublish(opts: PublishEcrOptions & CliSettingsFlags) {
  try {
    const options = publishEcrOptionsSchema.parse(opts);
    const publisher = toPublisher(options, toPublisherSettings(opts));
    const {newVersion, digest} = await publisher.publish(options);
    console.log(`✅ Published ${chalk.green(newVersion)} ${digest}`);
  } catch (error) {
    printError(error);
    process.exit(exitCodeFor(error));
  }
}

function printError(error: unknown) {
  if (isEcrPublisherError(error, "CANCELLED")) {
    console.log(`🚫 ${(error as Error).message}`);
  } else {
    console.error("❌ Error:", (error as Error).message);
  }
}

function toPublisher(opts: PublishEcrOptions, settings: PublisherSettings) {
  if (opts.public) {
    const ecrPublic = new ECRPUBLICClient({region: "us-east-1"});
    return createPublicEcrPublisher(ecrPublic, settings);
  } else {
    const ecr = new ECRClient({region: opts.region});
    return createEcrPublisher(ecr, settings);
  }
}
