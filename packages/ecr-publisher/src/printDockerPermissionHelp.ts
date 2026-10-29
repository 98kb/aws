/* eslint-disable no-console */

export function printDockerPermissionHelp(): void {
  const messages = [
    "❌ Docker permission error detected!",
    "\n🔧 To fix this issue, try one of the following:\n",
    "1. Add your user to the docker group:",
    "   sudo usermod -aG docker $USER",
    "   newgrp docker",
    "\n2. Or run with sudo:",
    `   sudo ${process.argv.join(" ")}`,
    "\n3. Make sure Docker daemon is running:",
    "   sudo systemctl start docker",
    "\n4. Check Docker socket permissions:",
    "   sudo chmod 666 /var/run/docker.sock",
  ];
  messages.forEach(msg => console.error(msg));
}
