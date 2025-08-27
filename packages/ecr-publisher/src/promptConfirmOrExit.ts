import chalk from "chalk";
import prompts from "prompts";

export async function promptConfirmOrExit(message: string) {
  const {confirm} = await prompts({
    type: "confirm",
    name: "confirm",
    message: chalk.gray(message),
    initial: true,
  });
  if (!confirm) {
    process.exit(0);
  }
}
