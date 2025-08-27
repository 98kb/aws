import chalk from "chalk";

export function printCommand(command: string): void {
  // eslint-disable-next-line no-console
  console.log(`🔨 ${chalk.yellow("Running:")} ${chalk.blueBright(command)}`);
}
