/**
 * Servidor mínimo del sandbox: ejecuta código de usuario en un subproceso con timeout.
 * POST /run body: { language, code, stdin?, timeoutMs? }
 * Response: { stdout, stderr, exitCode, timedOut }
 * Lenguajes: javascript, node, typescript, python, java
 */
import http from "http";
import { spawnSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

const PORT = Number(process.env.PORT) || 3001;
const DEFAULT_TIMEOUT_MS = 10000;
const MAX_TIMEOUT_MS = 30000;
const MAX_BUFFER = 512 * 1024;

function runCode(language, code, stdin = "", timeoutMs = DEFAULT_TIMEOUT_MS) {
  const timeout = Math.min(Math.max(1000, timeoutMs), MAX_TIMEOUT_MS);
  const normalizedLang = language === "node" ? "javascript" : String(language).toLowerCase();

  const run = (cmd, args, opts = {}) => {
    const r = spawnSync(cmd, args, {
      input: stdin,
      encoding: "utf8",
      timeout,
      maxBuffer: MAX_BUFFER,
      ...opts,
    });
    const timedOut = r.signal === "SIGTERM";
    return {
      stdout: r.stdout ?? "",
      stderr: r.stderr ?? "",
      exitCode: r.status ?? (timedOut ? 124 : 0),
      timedOut,
    };
  };

  if (normalizedLang === "javascript") {
    return run(process.execPath, ["-e", code]);
  }

  if (normalizedLang === "typescript") {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "ts-"));
    const file = path.join(dir, "run.ts");
    try {
      fs.writeFileSync(file, code, "utf8");
      const r = spawnSync("npx", ["ts-node", "--transpileOnly", file], {
        encoding: "utf8",
        timeout,
        maxBuffer: MAX_BUFFER,
        cwd: dir,
      });
      const timedOut = r.signal === "SIGTERM";
      return {
        stdout: r.stdout ?? "",
        stderr: r.stderr ?? "",
        exitCode: r.status ?? (timedOut ? 124 : 0),
        timedOut,
      };
    } finally {
      try { fs.rmSync(dir, { recursive: true }); } catch {}
    }
  }

  if (normalizedLang === "python") {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "py-"));
    const file = path.join(dir, "run.py");
    try {
      fs.writeFileSync(file, code, "utf8");
      const r = spawnSync("python3", [file], {
        input: stdin,
        encoding: "utf8",
        timeout,
        maxBuffer: MAX_BUFFER,
        cwd: dir,
      });
      const timedOut = r.signal === "SIGTERM";
      return {
        stdout: r.stdout ?? "",
        stderr: r.stderr ?? "",
        exitCode: r.status ?? (timedOut ? 124 : 0),
        timedOut,
      };
    } finally {
      try { fs.rmSync(dir, { recursive: true }); } catch {}
    }
  }

  if (normalizedLang === "java") {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "java-"));
    const hasPublicClass = /public\s+class\s+\w+/.test(code);
    const fileName = hasPublicClass ? (code.match(/public\s+class\s+(\w+)/)?.[1] || "Main") + ".java" : "Main.java";
    const content = hasPublicClass ? code : `public class Main { public static void main(String[] args) {\n${code}\n} }`;
    const file = path.join(dir, fileName);
    const baseName = path.basename(file, ".java");
    try {
      fs.writeFileSync(file, content, "utf8");
      const comp = spawnSync("javac", [fileName], {
        encoding: "utf8",
        timeout,
        maxBuffer: MAX_BUFFER,
        cwd: dir,
      });
      if (comp.status !== 0) {
        return {
          stdout: comp.stdout ?? "",
          stderr: comp.stderr ?? "Error de compilación.",
          exitCode: comp.status ?? 1,
          timedOut: false,
        };
      }
      const r = spawnSync("java", [baseName], {
        input: stdin,
        encoding: "utf8",
        timeout,
        maxBuffer: MAX_BUFFER,
        cwd: dir,
      });
      const timedOut = r.signal === "SIGTERM";
      return {
        stdout: r.stdout ?? "",
        stderr: r.stderr ?? "",
        exitCode: r.status ?? (timedOut ? 124 : 0),
        timedOut,
      };
    } finally {
      try { fs.rmSync(dir, { recursive: true }); } catch {}
    }
  }

  return {
    stdout: "",
    stderr: `Lenguaje no soportado: ${language}. Use javascript, typescript, python o java.`,
    exitCode: 1,
    timedOut: false,
  };
}

const server = http.createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json");
  if (req.method !== "POST" || req.url !== "/run") {
    res.writeHead(404);
    res.end(JSON.stringify({ error: "Not Found. Use POST /run" }));
    return;
  }
  let body = "";
  for await (const chunk of req) body += chunk;
  try {
    const data = JSON.parse(body);
    const language = data.language ?? "javascript";
    const code = typeof data.code === "string" ? data.code : "";
    const stdin = typeof data.stdin === "string" ? data.stdin : "";
    const timeoutMs = typeof data.timeoutMs === "number" ? data.timeoutMs : DEFAULT_TIMEOUT_MS;
    const result = runCode(language, code, stdin, timeoutMs);
    res.writeHead(200);
    res.end(JSON.stringify(result));
  } catch (err) {
    res.writeHead(500);
    res.end(JSON.stringify({
      stdout: "",
      stderr: err.message ?? "Error interno",
      exitCode: 1,
      timedOut: false,
    }));
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Sandbox escuchando en puerto ${PORT}`);
});
