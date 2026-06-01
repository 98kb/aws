/* eslint-disable no-console */
import {ECRClient} from "@aws-sdk/client-ecr";
import {ECRPUBLICClient} from "@aws-sdk/client-ecr-public";
import type {PublishEcrOptions} from "./PublishEcrOptions";
import {createEcrPublisher} from "./createEcrPublisher";
import {createPublicEcrPublisher} from "./createPublicEcrPublisher";
import chalk from "chalk";
import {publishEcrOptionsSchema} from "./publishEcrOptionsSchema";
import {Command} from "commander";

new Command()
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
  .action(async (opts: PublishEcrOptions) => {
    try {
      opts["versionPrefix"] ??= "";
      publishEcrOptionsSchema.parse(opts);
      const publisher = toPublisher(opts);
      await publisher.publish(opts);
    } catch (error) {
      console.error("❌ Error:", (error as Error).message);
      process.exit(1);
    }
  })
  .parse(process.argv);

function toPublisher(opts: PublishEcrOptions) {
  if (opts.public) {
    const ecrPublic = new ECRPUBLICClient({region: "us-east-1"});
    return createPublicEcrPublisher(ecrPublic);
  } else {
    const ecr = new ECRClient({region: opts.region});
    return createEcrPublisher(ecr);
  }
}
