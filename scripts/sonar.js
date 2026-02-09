"use strict";

const path = require("path");
const { spawnSync } = require("child_process");
require("dotenv").config({ path: ".env" });

const projectPath = path.resolve(process.cwd());

const result = spawnSync(
  "docker",
  [
    "run",
    "--rm",
    "-e",
    "SONAR_HOST_URL",
    "-e",
    "SONAR_TOKEN",
    "-v",
    `${projectPath}:/usr/src`,
    "-w",
    "/usr/src",
    "sonarsource/sonar-scanner-cli",
  ],
  {
    stdio: "inherit",
    env: process.env,
    shell: true,
  }
);

process.exit(result.status ?? 1);
