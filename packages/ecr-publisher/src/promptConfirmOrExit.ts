import prompts from "prompts";

export async function promptConfirmOrExit(message: string) {
  const {confirm} = await prompts({
    type: "confirm",
    name: "confirm",
    message,
    initial: true,
  });
  if (!confirm) {
    process.exit(0);
  }
}
