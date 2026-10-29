import {CreateRepositoryCommand, type ECRClient} from "@aws-sdk/client-ecr";
import {startSpinner} from "./startSpinner";

export async function createEcrRepo(
  ecr: ECRClient,
  repo: string,
  interactive: boolean,
) {
  const spinner = startSpinner(`🚀 Creating ${repo}...`, interactive);
  try {
    await ecr.send(new CreateRepositoryCommand({repositoryName: repo}));
  } finally {
    spinner.stop();
  }
}
