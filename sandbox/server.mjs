import http from "http";
import { spawn } from "child_process";
import { writeFile, mkdtemp } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";

const PORT = Number(process.env.PORT) || 3001;
const TIMEOUT_MS = 15_000;

const LANGS = {
  python: { ext: "py", cmd: "python3", args: (f) => [f] },
  javascript: { ext: "js", cmd: "node", args: (f) => [f] },
  typescript: { ext: "ts", cmd: "npx", args: (f) => ["tsx", f] },
  java: { ext: "java", file: "Main.java", isJava: true },
};

function runProcess(proc, stdinStr, timeoutMs) {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    const to = setTimeout(() => {
      timedOut = true;
      proc.kill("SIGKILL");
    }, timeoutMs);
    proc.stdout?.on("data", (d) => (stdout += d.toString()));
    proc.stderr?.on("data", (d) => (stderr += d.toString()));
    if (stdinStr) proc.stdin?.write(stdinStr);
    proc.stdin?.end();
    proc.on("close", (exitCode) => {
      clearTimeout(to);
      resolve({ stdout, stderr, exitCode: exitCode ?? 1, timedOut });
    });
  });
}

async function runCode(language, code, stdin = "") {
  const config = LANGS[language];
  if (!config) {
    return { stdout: "", stderr: `Lenguaje no soportado: ${language}`, exitCode: 1, timedOut: false };
  }

  const dir = await mkdtemp(join(tmpdir(), "run-"));
  try {
    if (config.isJava) {
      const javaFile = join(dir, "Main.java");
      await writeFile(javaFile, code, "utf8");
      const javac = spawn("javac", ["Main.java"], { cwd: dir });
      let err = "";
      javac.stderr?.on("data", (d) => (err += d.toString()));
      const compExit = await new Promise((r) => javac.on("close", r));
      if (compExit !== 0) {
        return { stdout: "", stderr: err || "Error de compilación", exitCode: compExit, timedOut: false };
      }
      const proc = spawn("java", ["Main"], { cwd: dir });
      return runProcess(proc, stdin, TIMEOUT_MS);
    }

    const file = join(dir, `main.${config.ext}`);
    await writeFile(file, code, "utf8");
    const proc = spawn(config.cmd, config.args(file), { cwd: dir });
    return runProcess(proc, stdin, TIMEOUT_MS);
  } finally {
    // Temp dir left for OS to clean; no unlink of dir in Node easily
  }
}

const server = http.createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  if (req.method !== "POST" || req.url !== "/run") {
    res.writeHead(404);
    res.end(JSON.stringify({ error: "Not Found" }));
    return;
  }
  let body = "";
  for await (const chunk of req) body += chunk;
  let data;
  try {
    data = JSON.parse(body);
  } catch {
    res.writeHead(400);
    res.end(JSON.stringify({ error: "Body JSON inválido" }));
    return;
  }
  const { language, code, stdin } = data ?? {};
  if (!language || typeof code !== "string") {
    res.writeHead(400);
    res.end(JSON.stringify({ error: "Faltan language o code" }));
    return;
  }
  const result = await runCode(language, code, typeof stdin === "string" ? stdin : "");
  res.writeHead(200);
  res.end(JSON.stringify(result));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Sandbox escuchando en :${PORT}`);
});
