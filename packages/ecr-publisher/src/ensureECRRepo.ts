import chalk from "chalk";
import {checkEcrRepoExists} from "./checkEcrRepoExists";
import {createEcrRepo} from "./createEcrRepo";
import {checkEcrPublicRepoExists} from "./checkEcrPublicRepoExists";
import {createEcrPublicRepo} from "./createEcrPublicRepo";
import {confirmStep} from "./confirmStep";
import {RepositoryMissingError} from "./RepositoryMissingError";
import {startSpinner} from "./startSpinner";
import type {Context} from "./Context";

type RepoAccess = {
  label: string;
  exists: () => Promise<boolean>;
  create: () => Promise<void>;
};

/**
 * Ensures the target repo exists, applying the `createRepo` policy when it is
 * missing. `yes` never answers the repo-creation question.
 */
export async function ensureECRRepo(context: Context) {
  const access = context.options.public
    ? publicRepo(context)
    : privateRepo(context);
  if (await checkExists(context, access)) return;
  await approveCreation(context, access.label);
  await access.create();
}

function publicRepo(context: Context): RepoAccess {
  const {ecrPublic} = context;
  if (!ecrPublic)
    throw new Error("ECRPublicClient is required when --public is set");
  const {repo} = context.options;
  return {
    label: "Public ECR repo",
    exists: () => checkEcrPublicRepoExists(ecrPublic, repo),
    create: () =>
      createEcrPublicRepo(ecrPublic, repo, context.settings.interactive),
  };
}

function privateRepo(context: Context): RepoAccess {
  const {ecr} = context;
  if (!ecr) throw new Error("ECRClient is required for private ECR");
  const {repo} = context.options;
  return {
    label: "ECR repo",
    exists: () => checkEcrRepoExists(ecr, repo),
    create: () => createEcrRepo(ecr, repo, context.settings.interactive),
  };
}

async function checkExists(
  context: Context,
  access: RepoAccess,
): Promise<boolean> {
  const spinner = startSpinner(
    "Checking ECR repo...",
    context.settings.interactive,
  );
  try {
    return await access.exists();
  } finally {
    spinner.stop();
  }
}

async function approveCreation(context: Context, label: string) {
  const {createRepo} = context.settings;
  const {repo} = context.options;
  if (createRepo === "always") return;
  if (!mayAsk(context)) throw new RepositoryMissingError(repo);
  await confirmStep(
    context,
    "create-repo",
    `${label} ${repo} not found. Create it?`,
    chalk.gray(`${label} ${chalk.blue(repo)} not found. Create it?`),
  );
}

function mayAsk({settings}: Context): boolean {
  return settings.createRepo === "prompt" && settings.interactive;
}
