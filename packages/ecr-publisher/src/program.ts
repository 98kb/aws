import {Command} from "commander";

export const program = new Command();
program
  .name("ecr-publisher")
  .requiredOption("-r, --repo <name>", "ECR repository name")
  .option("--bump <type>", "Bump type (major, minor, patch)", "minor")
  .option("--region <region>", "AWS region")
  .option("--dryRun", "Run without making any changes")
  .option(
    "--docker-args <args...>",
    "Additional docker build arguments (e.g., --docker-args -f Dockerfile --build-arg NODE_ENV=production)",
  )
  .argument("[context]", "Docker build context path", ".");
