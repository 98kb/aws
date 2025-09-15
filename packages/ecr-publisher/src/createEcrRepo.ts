import ora from "ora";
import {CreateRepositoryCommand, type ECRClient} from "@aws-sdk/client-ecr";
import chalk from "chalk";
import prompts from "prompts";

export async function createEcrRepo(ecr: ECRClient, repo: string) {
  const {shouldCreate} = await prompts({
    type: "confirm",
    name: "shouldCreate",
    message: chalk.gray(`ECR repo ${chalk.blue(repo)} not found. Create it?`),
    initial: true,
  });

  if (shouldCreate) {
    const spinner = ora(`🚀 Creating ${repo}...`).start();
    try {
      await ecr.send(new CreateRepositoryCommand({repositoryName: repo}));
    } finally {
      spinner.stop();
    }
  } else {
    process.exit(0);
  }
}
