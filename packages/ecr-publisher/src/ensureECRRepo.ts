/* eslint-disable no-console */
import {
  type ECRClient,
  CreateRepositoryCommand,
  DescribeRepositoriesCommand,
} from "@aws-sdk/client-ecr";
import type {Options} from "./Options";

export async function ensureECRRepo(ecr: ECRClient, opts: Options) {
  if (opts.dryRun) {
    console.log(`🔍 Checking ECR repo: ${opts.repo}`);
    return;
  }
  await addECRRepo(ecr, opts.repo);
}

async function addECRRepo(ecr: ECRClient, repo: string) {
  try {
    await ecr.send(new DescribeRepositoriesCommand({repositoryNames: [repo]}));
    console.log(`✅ Repo found: ${repo}`);
  } catch {
    console.log(`🚀 Creating ECR repo: ${repo}`);
    await ecr.send(new CreateRepositoryCommand({repositoryName: repo}));
  }
}
