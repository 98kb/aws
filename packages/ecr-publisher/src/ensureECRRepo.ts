import ora from "ora";
import {checkEcrRepoExists} from "./checkEcrRepoExists";
import {createEcrRepo} from "./createEcrRepo";
import {checkEcrPublicRepoExists} from "./checkEcrPublicRepoExists";
import {createEcrPublicRepo} from "./createEcrPublicRepo";
import type {Context} from "./Context";

export async function ensureECRRepo(context: Context) {
  if (context.options.public) {
    await ensurePublicRepo(context);
  } else {
    await ensurePrivateRepo(context);
  }
}

async function ensurePublicRepo(context: Context) {
  const spinner = ora("Checking ECR repo...").start();
  if (!context.ecrPublic)
    throw new Error("ECRPublicClient is required when --public is set");
  const repoExists = await checkEcrPublicRepoExists(
    context.ecrPublic,
    context.options.repo,
  );
  spinner.stop();
  if (!repoExists) {
    await createEcrPublicRepo(context.ecrPublic, context.options.repo);
  }
}

async function ensurePrivateRepo(context: Context) {
  const spinner = ora("Checking ECR repo...").start();
  if (!context.ecr) throw new Error("ECRClient is required for private ECR");
  const repoExists = await checkEcrRepoExists(
    context.ecr,
    context.options.repo,
  );
  spinner.stop();
  if (!repoExists) {
    await createEcrRepo(context.ecr, context.options.repo);
  }
}
