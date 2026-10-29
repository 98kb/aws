import {
  type ECRPUBLICClient,
  CreateRepositoryCommand,
} from "@aws-sdk/client-ecr-public";
import {startSpinner} from "./startSpinner";

export async function createEcrPublicRepo(
  ecr: ECRPUBLICClient,
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
