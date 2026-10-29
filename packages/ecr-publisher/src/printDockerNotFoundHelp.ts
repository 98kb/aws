/* eslint-disable no-console */

export function printDockerNotFoundHelp(): void {
  console.error("❌ Docker is not installed or not in PATH!");
  console.error("\n🔧 Install Docker:");
  console.error("   Visit: https://docs.docker.com/engine/install/");
}
