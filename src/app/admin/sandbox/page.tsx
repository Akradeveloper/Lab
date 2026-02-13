"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { CodeEditor } from "@/components/code-editor";

const LANGUAGES = [
  { value: "python", label: "Python" },
  { value: "javascript", label: "JavaScript" },
  { value: "java", label: "Java" },
  { value: "typescript", label: "TypeScript" },
] as const;

const FRAMEWORKS = [
  { value: "selenium", label: "Selenium" },
  { value: "cypress", label: "Cypress" },
  { value: "playwright", label: "Playwright" },
] as const;

function getFrameworksForLanguage(lang: string): readonly { value: string; label: string }[] {
  if (lang === "java") return FRAMEWORKS.filter((f) => f.value === "selenium" || f.value === "playwright");
  if (lang === "python") return FRAMEWORKS.filter((f) => f.value === "selenium" || f.value === "playwright");
  if (lang === "javascript" || lang === "typescript") return FRAMEWORKS;
  return FRAMEWORKS;
}

type JobStatus = "PENDING" | "RUNNING" | "COMPLETED" | "FAILED";

type JobResult = {
  status: JobStatus;
  position?: number;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
  timedOut?: boolean;
};

const DEFAULT_CODE: Record<string, string> = {
  python: "print('Hola, mundo')",
  javascript: "console.log('Hola, mundo');",
  java: "public class Main {\n  public static void main(String[] args) {\n    System.out.println(\"Hola, mundo\");\n  }\n}",
  typescript: "console.log('Hola, mundo');",
};

type FullSnippet = {
  id: string;
  label: string;
  codeByLang?: Record<string, string>;
  codeByLangAndFramework?: Record<string, Record<string, string>>;
};

const FULL_SNIPPETS_QA: FullSnippet[] = [
  {
    id: "http-title",
    label: "Verificar título (HTTP)",
    codeByLang: {
      python: `import re
import urllib.request

url = "https://www.iana.org/domains/reserved"
expected = "IANA"
with urllib.request.urlopen(url) as resp:
    html = resp.read().decode()
m = re.search(r"(?is)<title[^>]*>(.*?)</title>", html)
title = m.group(1).strip() if m else ""
if expected not in title:
    raise AssertionError(f"Esperaba '{expected}' en el título, obtuve: {title!r}")
print("OK: el título coincide")`,
      javascript: `(async () => {
  const url = "https://www.iana.org/domains/reserved";
  const expected = "IANA";
  const html = await fetch(url).then((r) => r.text());
  const m = html.match(/<title[^>]*>([\\s\\S]*?)<\\/title>/i);
  const title = m ? m[1].trim() : "";
  if (!title.includes(expected)) {
    throw new Error("Esperaba '" + expected + "' en el título, obtuve: " + title);
  }
  console.log("OK: el título coincide");
})();`,
      typescript: `(async () => {
  const url = "https://www.iana.org/domains/reserved";
  const expected = "IANA";
  const html = await fetch(url).then((r) => r.text());
  const m = html.match(/<title[^>]*>([\\s\\S]*?)<\\/title>/i);
  const title = m ? m[1].trim() : "";
  if (!title.includes(expected)) {
    throw new Error("Esperaba '" + expected + "' en el título, obtuve: " + title);
  }
  console.log("OK: el título coincide");
})();`,
      java: `import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class Main {
    public static void main(String[] args) throws Exception {
        String url = "https://www.iana.org/domains/reserved";
        String expected = "IANA";
        HttpClient client = HttpClient.newHttpClient();
        HttpRequest request = HttpRequest.newBuilder(URI.create(url))
                .header("User-Agent", "Mozilla/5.0")
                .GET()
                .build();
        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() >= 400) {
            throw new RuntimeException("HTTP " + response.statusCode());
        }
        String html = response.body();
        Matcher m = Pattern.compile("(?is)<title[^>]*>(.*?)</title>").matcher(html);
        String title = m.find() ? m.group(1).replaceAll("\\\\s+", " ").trim() : "";
        if (!title.contains(expected)) {
            throw new IllegalStateException("Esperaba '" + expected + "' en el título, obtuve: " + title);
        }
        System.out.println("OK: el título coincide");
    }
}`,
    },
  },
  {
    id: "e2e-title",
    label: "E2E: verificar título",
    codeByLangAndFramework: {
      python: {
        selenium: `from selenium import webdriver
from selenium.webdriver.chrome.options import Options

opts = Options()
opts.binary_location = "/usr/bin/chromium"
opts.add_argument("--no-sandbox")
opts.add_argument("--headless=new")
opts.add_argument("--disable-gpu")
opts.add_argument("--disable-dev-shm-usage")
driver = webdriver.Chrome(options=opts)
try:
    driver.get("https://www.iana.org/domains/reserved")
    assert "IANA" in driver.title
    print("OK: el título coincide")
finally:
    driver.quit()`,
        playwright: `from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    try:
        page.goto("https://www.iana.org/domains/reserved")
        title = page.title()
        if "IANA" not in title:
            raise AssertionError("Título incorrecto: " + title)
        print("OK: el título coincide")
    finally:
        browser.close()`,
      },
      javascript: {
        selenium: `const { Builder } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

const opts = new chrome.Options();
opts.setChromeBinaryPath("/usr/bin/chromium");
opts.addArguments("--no-sandbox", "--headless=new", "--disable-gpu", "--disable-dev-shm-usage");

(async () => {
  const driver = await new Builder().forBrowser("chrome").setChromeOptions(opts).build();
  try {
    await driver.get("https://www.iana.org/domains/reserved");
    const title = await driver.getTitle();
    if (!title.includes("IANA")) throw new Error("Título incorrecto: " + title);
    console.log("OK: el título coincide");
  } finally {
    await driver.quit();
  }
})();`,
        cypress: `describe("E2E título", () => {
  it("verifica que el título incluye IANA", () => {
    cy.visit("https://www.iana.org/domains/reserved");
    cy.title().should("include", "IANA");
  });
});`,
        playwright: `const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    await page.goto("https://www.iana.org/domains/reserved");
    const title = await page.title();
    if (!title.includes("IANA")) throw new Error("Título incorrecto: " + title);
    console.log("OK: el título coincide");
  } finally {
    await browser.close();
  }
})();`,
      },
      typescript: {
        selenium: `import { Builder } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome";

const opts = new chrome.Options();
opts.setChromeBinaryPath("/usr/bin/chromium");
opts.addArguments("--no-sandbox", "--headless=new", "--disable-gpu", "--disable-dev-shm-usage");

(async () => {
  const driver = await new Builder().forBrowser("chrome").setChromeOptions(opts).build();
  try {
    await driver.get("https://www.iana.org/domains/reserved");
    const title = await driver.getTitle();
    if (!title.includes("IANA")) throw new Error("Título incorrecto: " + title);
    console.log("OK: el título coincide");
  } finally {
    await driver.quit();
  }
})();`,
        cypress: `describe("E2E título", () => {
  it("verifica que el título incluye IANA", () => {
    cy.visit("https://www.iana.org/domains/reserved");
    cy.title().should("include", "IANA");
  });
});`,
        playwright: `import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    await page.goto("https://www.iana.org/domains/reserved");
    const title = await page.title();
    if (!title.includes("IANA")) throw new Error("Título incorrecto: " + title);
    console.log("OK: el título coincide");
  } finally {
    await browser.close();
  }
})();`,
      },
      java: {
        selenium: `import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;

public class Main {
    public static void main(String[] args) {
        ChromeOptions options = new ChromeOptions();
        options.setBinary("/usr/bin/chromium");
        options.addArguments("--no-sandbox", "--headless=new", "--disable-gpu", "--disable-dev-shm-usage");
        WebDriver driver = new ChromeDriver(options);
        try {
            driver.get("https://www.iana.org/domains/reserved");
            if (!driver.getTitle().contains("IANA")) {
                throw new RuntimeException("Título incorrecto: " + driver.getTitle());
            }
            System.out.println("OK: el título coincide");
        } finally {
            driver.quit();
        }
    }
}`,
        playwright: `import com.microsoft.playwright.*;

public class Main {
    public static void main(String[] args) {
        try (Playwright playwright = Playwright.create()) {
            Browser browser = playwright.chromium().launch();
            Page page = browser.newPage();
            page.navigate("https://www.iana.org/domains/reserved");
            String title = page.title();
            if (title == null || !title.contains("IANA")) {
                throw new RuntimeException("Título incorrecto: " + title);
            }
            System.out.println("OK: el título coincide");
            browser.close();
        }
    }
}`,
      },
    },
  },
  {
    id: "e2e-click",
    label: "E2E: click y assert",
    codeByLangAndFramework: {
      python: {
        selenium: `from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

opts = Options()
opts.binary_location = "/usr/bin/chromium"
opts.add_argument("--no-sandbox")
opts.add_argument("--headless=new")
opts.add_argument("--disable-gpu")
opts.add_argument("--disable-dev-shm-usage")
driver = webdriver.Chrome(options=opts)
try:
    driver.get("https://ejemplo.com")
    driver.find_element(By.CSS_SELECTOR, "button.primary").click()
    assert "texto esperado" in driver.page_source
    print("OK: click y texto encontrado")
finally:
    driver.quit()`,
        playwright: `from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    try:
        page.goto("https://ejemplo.com")
        page.get_by_role("button", name="Enviar").click()
        locator = page.get_by_text("texto esperado")
        if not locator.is_visible():
            raise AssertionError("Texto no visible")
        print("OK: click y texto encontrado")
    finally:
        browser.close()`,
      },
      javascript: {
        selenium: `const { Builder, By } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

const opts = new chrome.Options();
opts.setChromeBinaryPath("/usr/bin/chromium");
opts.addArguments("--no-sandbox", "--headless=new", "--disable-gpu", "--disable-dev-shm-usage");

(async () => {
  const driver = await new Builder().forBrowser("chrome").setChromeOptions(opts).build();
  try {
    await driver.get("https://ejemplo.com");
    await driver.findElement(By.css("button.primary")).click();
    const source = await driver.getPageSource();
    if (!source.includes("texto esperado")) throw new Error("Texto no encontrado");
    console.log("OK: click y texto encontrado");
  } finally {
    await driver.quit();
  }
})();`,
        cypress: `describe("E2E click", () => {
  it("hace click y verifica texto", () => {
    cy.visit("https://ejemplo.com");
    cy.get("button.primary").click();
    cy.contains("texto esperado").should("be.visible");
  });
});`,
        playwright: `const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    await page.goto("https://ejemplo.com");
    await page.getByRole("button", { name: "Enviar" }).click();
    const locator = page.getByText("texto esperado");
    if (!(await locator.isVisible())) throw new Error("Texto no visible");
    console.log("OK: click y texto encontrado");
  } finally {
    await browser.close();
  }
})();`,
      },
      typescript: {
        selenium: `import { Builder, By } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome";

const opts = new chrome.Options();
opts.setChromeBinaryPath("/usr/bin/chromium");
opts.addArguments("--no-sandbox", "--headless=new", "--disable-gpu", "--disable-dev-shm-usage");

(async () => {
  const driver = await new Builder().forBrowser("chrome").setChromeOptions(opts).build();
  try {
    await driver.get("https://ejemplo.com");
    await driver.findElement(By.css("button.primary")).click();
    const source = await driver.getPageSource();
    if (!source.includes("texto esperado")) throw new Error("Texto no encontrado");
    console.log("OK: click y texto encontrado");
  } finally {
    await driver.quit();
  }
})();`,
        cypress: `describe("E2E click", () => {
  it("hace click y verifica texto", () => {
    cy.visit("https://ejemplo.com");
    cy.get("button.primary").click();
    cy.contains("texto esperado").should("be.visible");
  });
});`,
        playwright: `import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    await page.goto("https://ejemplo.com");
    await page.getByRole("button", { name: "Enviar" }).click();
    const locator = page.getByText("texto esperado");
    if (!(await locator.isVisible())) throw new Error("Texto no visible");
    console.log("OK: click y texto encontrado");
  } finally {
    await browser.close();
  }
})();`,
      },
      java: {
        selenium: `import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;

public class Main {
    public static void main(String[] args) {
        ChromeOptions options = new ChromeOptions();
        options.setBinary("/usr/bin/chromium");
        options.addArguments("--no-sandbox", "--headless=new", "--disable-gpu", "--disable-dev-shm-usage");
        WebDriver driver = new ChromeDriver(options);
        try {
            driver.get("https://ejemplo.com");
            driver.findElement(By.cssSelector("button.primary")).click();
            if (!driver.getPageSource().contains("texto esperado")) {
                throw new RuntimeException("Texto no encontrado en la página");
            }
            System.out.println("OK: click y texto encontrado");
        } finally {
            driver.quit();
        }
    }
}`,
        playwright: `import com.microsoft.playwright.*;

public class Main {
    public static void main(String[] args) {
        try (Playwright playwright = Playwright.create()) {
            Browser browser = playwright.chromium().launch();
            Page page = browser.newPage();
            page.navigate("https://ejemplo.com");
            page.locator("button.primary").click();
            if (!page.getByText("texto esperado").isVisible()) {
                throw new RuntimeException("Texto no visible");
            }
            System.out.println("OK: click y texto encontrado");
            browser.close();
        }
    }
}`,
      },
    },
  },
  {
    id: "e2e-nav",
    label: "E2E: navegación",
    codeByLangAndFramework: {
      python: {
        selenium: `from selenium import webdriver
from selenium.webdriver.chrome.options import Options

opts = Options()
opts.binary_location = "/usr/bin/chromium"
opts.add_argument("--no-sandbox")
opts.add_argument("--headless=new")
opts.add_argument("--disable-gpu")
opts.add_argument("--disable-dev-shm-usage")
driver = webdriver.Chrome(options=opts)
try:
    url1 = "https://www.iana.org"
    url2 = "https://www.iana.org/domains/reserved"
    driver.get(url1)
    driver.get(url2)
    driver.back()
    assert url1 in driver.current_url or "iana.org" in driver.current_url
    driver.refresh()
    print("OK: navegación (atrás y refresh) correcta")
finally:
    driver.quit()`,
        playwright: `from playwright.sync_api import sync_playwright

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page()
    try:
        url1 = "https://www.iana.org"
        page.goto(url1)
        page.goto("https://www.iana.org/domains/reserved")
        page.go_back()
        current = page.url
        if "iana.org" not in current:
            raise AssertionError("URL incorrecta tras atrás: " + current)
        page.reload()
        print("OK: navegación (atrás y refresh) correcta")
    finally:
        browser.close()`,
      },
      javascript: {
        selenium: `const { Builder } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");

const opts = new chrome.Options();
opts.setChromeBinaryPath("/usr/bin/chromium");
opts.addArguments("--no-sandbox", "--headless=new", "--disable-gpu", "--disable-dev-shm-usage");

(async () => {
  const driver = await new Builder().forBrowser("chrome").setChromeOptions(opts).build();
  try {
    const url1 = "https://www.iana.org";
    await driver.get(url1);
    await driver.get("https://www.iana.org/domains/reserved");
    await driver.navigate().back();
    const current = await driver.getCurrentUrl();
    if (!current.includes("iana.org")) throw new Error("URL incorrecta tras atrás: " + current);
    await driver.navigate().refresh();
    console.log("OK: navegación (atrás y refresh) correcta");
  } finally {
    await driver.quit();
  }
})();`,
        cypress: `describe("E2E navegación", () => {
  it("navega, atrás y refresh", () => {
    cy.visit("https://www.iana.org");
    cy.visit("https://www.iana.org/domains/reserved");
    cy.go("back");
    cy.url().should("include", "iana.org");
    cy.reload();
  });
});`,
        playwright: `const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    const url1 = "https://www.iana.org";
    await page.goto(url1);
    await page.goto("https://www.iana.org/domains/reserved");
    await page.goBack();
    const current = page.url();
    if (!current.includes("iana.org")) throw new Error("URL incorrecta tras atrás: " + current);
    await page.reload();
    console.log("OK: navegación (atrás y refresh) correcta");
  } finally {
    await browser.close();
  }
})();`,
      },
      typescript: {
        selenium: `import { Builder } from "selenium-webdriver";
import chrome from "selenium-webdriver/chrome";

const opts = new chrome.Options();
opts.setChromeBinaryPath("/usr/bin/chromium");
opts.addArguments("--no-sandbox", "--headless=new", "--disable-gpu", "--disable-dev-shm-usage");

(async () => {
  const driver = await new Builder().forBrowser("chrome").setChromeOptions(opts).build();
  try {
    const url1 = "https://www.iana.org";
    await driver.get(url1);
    await driver.get("https://www.iana.org/domains/reserved");
    await driver.navigate().back();
    const current = await driver.getCurrentUrl();
    if (!current.includes("iana.org")) throw new Error("URL incorrecta tras atrás: " + current);
    await driver.navigate().refresh();
    console.log("OK: navegación (atrás y refresh) correcta");
  } finally {
    await driver.quit();
  }
})();`,
        cypress: `describe("E2E navegación", () => {
  it("navega, atrás y refresh", () => {
    cy.visit("https://www.iana.org");
    cy.visit("https://www.iana.org/domains/reserved");
    cy.go("back");
    cy.url().should("include", "iana.org");
    cy.reload();
  });
});`,
        playwright: `import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  try {
    const url1 = "https://www.iana.org";
    await page.goto(url1);
    await page.goto("https://www.iana.org/domains/reserved");
    await page.goBack();
    const current = page.url();
    if (!current.includes("iana.org")) throw new Error("URL incorrecta tras atrás: " + current);
    await page.reload();
    console.log("OK: navegación (atrás y refresh) correcta");
  } finally {
    await browser.close();
  }
})();`,
      },
      java: {
        selenium: `import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;

public class Main {
    public static void main(String[] args) {
        ChromeOptions options = new ChromeOptions();
        options.setBinary("/usr/bin/chromium");
        options.addArguments("--no-sandbox", "--headless=new", "--disable-gpu", "--disable-dev-shm-usage");
        WebDriver driver = new ChromeDriver(options);
        try {
            String url1 = "https://www.iana.org";
            driver.get(url1);
            driver.get("https://www.iana.org/domains/reserved");
            driver.navigate().back();
            String current = driver.getCurrentUrl();
            if (!current.contains("iana.org")) {
                throw new RuntimeException("URL incorrecta tras atrás: " + current);
            }
            driver.navigate().refresh();
            System.out.println("OK: navegación (atrás y refresh) correcta");
        } finally {
            driver.quit();
        }
    }
}`,
        playwright: `import com.microsoft.playwright.*;

public class Main {
    public static void main(String[] args) {
        try (Playwright playwright = Playwright.create()) {
            Browser browser = playwright.chromium().launch();
            Page page = browser.newPage();
            String url1 = "https://www.iana.org";
            page.navigate(url1);
            page.navigate("https://www.iana.org/domains/reserved");
            page.goBack();
            String current = page.url();
            if (current == null || !current.contains("iana.org")) {
                throw new RuntimeException("URL incorrecta tras atrás: " + current);
            }
            page.reload();
            System.out.println("OK: navegación (atrás y refresh) correcta");
            browser.close();
        }
    }
}`,
      },
    },
  },
];

export default function AdminSandboxPage() {
  const [language, setLanguage] = useState<string>("python");
  const [framework, setFramework] = useState<string>("selenium");
  const [code, setCode] = useState(DEFAULT_CODE.python);
  const [stdin, setStdin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<JobResult | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const availableFrameworks = getFrameworksForLanguage(language);
  const frameworkValid = availableFrameworks.some((f) => f.value === framework);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const runPolling = useCallback((jobId: string) => {
    const poll = async () => {
      try {
        await fetch("/api/internal/process-queue", { method: "POST", credentials: "include" });
        const res = await fetch(`/api/code/jobs/${jobId}`, { credentials: "include" });
        if (!res.ok) return;
        const data: JobResult = await res.json();
        setResult(data);
        if (data.status === "COMPLETED" || data.status === "FAILED") {
          if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
          }
          setRunning(false);
        }
      } catch {
        // ignorar errores de red en polling
      }
    };
    poll();
    pollRef.current = setInterval(poll, 800);
  }, []);

  const effectiveLanguage =
    framework === "cypress" && language === "javascript"
      ? "cypress-js"
      : framework === "cypress" && language === "typescript"
        ? "cypress-ts"
        : framework === "playwright" && language === "java"
          ? "java-playwright"
          : language;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setRunning(true);
    try {
      const res = await fetch("/api/admin/sandbox/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, language: effectiveLanguage, stdin: stdin || undefined }),
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? `Error ${res.status}`);
        setRunning(false);
        return;
      }
      const { jobId, position } = data;
      setResult({ status: "PENDING", position });
      runPolling(jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexión");
      setRunning(false);
    }
  }

  function handleLanguageChange(newLang: string) {
    const nextFrameworks = getFrameworksForLanguage(newLang);
    const currentFrameworkValid = nextFrameworks.some((f) => f.value === framework);
    setLanguage(newLang);
    setFramework(currentFrameworkValid ? framework : (nextFrameworks[0]?.value ?? "selenium"));
    setCode(DEFAULT_CODE[newLang] ?? "");
  }

  function applyFullExample(snippet: FullSnippet) {
    if (snippet.codeByLangAndFramework) {
      const byLang = snippet.codeByLangAndFramework[language];
      const fw = frameworkValid ? framework : (availableFrameworks[0]?.value ?? "selenium");
      const codeStr = byLang?.[fw] ?? byLang?.selenium ?? byLang?.playwright ?? Object.values(byLang ?? {})[0] ?? "";
      setCode(codeStr);
    } else {
      const codeStr = snippet.codeByLang?.[language] ?? snippet.codeByLang?.python ?? "";
      setCode(codeStr);
    }
  }

  return (
    <>
      <h1 className="mb-2 text-2xl font-semibold text-foreground">
        Probar sandbox
      </h1>
      <p className="mb-8 text-muted">
        Ejecuta código en el sandbox (Python, JavaScript, Java, TypeScript)
        sin interferir con la cola de ejercicios de los alumnos. Usa la cola
        de admin, que se atiende primero.
      </p>

      <section
        className="rounded-lg border border-border bg-surface p-6"
        aria-labelledby="sandbox-form-heading"
      >
        <h2
          id="sandbox-form-heading"
          className="mb-4 text-xl font-semibold text-foreground"
        >
          Ejecutar código
        </h2>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-foreground">Lenguaje</span>
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              disabled={running}
              className="max-w-[200px] rounded border border-border bg-background px-3 py-2 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50"
            >
              {LANGUAGES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          {availableFrameworks.length > 1 && (
            <label className="flex flex-col gap-1">
              <span className="text-sm font-medium text-foreground">Framework E2E</span>
              <select
                value={frameworkValid ? framework : (availableFrameworks[0]?.value ?? "selenium")}
                onChange={(e) => setFramework(e.target.value)}
                disabled={running}
                className="max-w-[200px] rounded border border-border bg-background px-3 py-2 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50"
              >
                {availableFrameworks.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-foreground">Código rápido</span>
            <p className="text-xs text-muted">
              Ejemplos completos por lenguaje (estructura lista para copiar y adaptar). Al elegir uno se reemplaza el código del editor.
            </p>
            <div className="flex flex-wrap gap-2">
              {FULL_SNIPPETS_QA.map((snippet) => (
                <button
                  key={snippet.id}
                  type="button"
                  disabled={running}
                  onClick={() => applyFullExample(snippet)}
                  className="rounded border border-border bg-background px-3 py-1.5 text-sm text-foreground transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-50"
                  title={`Cargar ejemplo completo: ${snippet.label}`}
                >
                  {snippet.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-sm font-medium text-foreground" id="sandbox-code-label">
              Código
            </span>
            <CodeEditor
              language={language}
              value={code}
              onChange={setCode}
              height="300px"
              readOnly={running}
            />
          </div>
          <label className="flex flex-col gap-1">
            <span className="text-sm font-medium text-foreground">
              Stdin (opcional)
            </span>
            <textarea
              value={stdin}
              onChange={(e) => setStdin(e.target.value)}
              disabled={running}
              rows={2}
              placeholder="Entrada estándar para el programa"
              className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50"
            />
          </label>
          <button
            type="submit"
            disabled={running}
            className="w-fit rounded border border-accent bg-accent/10 px-4 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50"
          >
            {running ? "Ejecutando…" : "Ejecutar"}
          </button>
        </form>

        {error && (
          <p
            role="alert"
            className="mt-4 text-sm text-red-600 dark:text-red-400"
          >
            {error}
          </p>
        )}

        {result && running && (
          <p className="mt-4 text-sm text-muted">
            {result.status === "PENDING" && (
              <>En cola (posición {result.position ?? 1})…</>
            )}
            {result.status === "RUNNING" && <>Ejecutando…</>}
          </p>
        )}

        {result && (result.status === "COMPLETED" || result.status === "FAILED") && (
          <div className="mt-6 space-y-4 rounded border border-border bg-background p-4">
            <p className="text-sm font-medium text-foreground">
              Resultado:{" "}
              {result.status === "COMPLETED"
                ? `Salida (exit code ${result.exitCode ?? 0})`
                : "Error"}
              {result.timedOut && " · Timeout"}
            </p>
            {result.stdout != null && result.stdout !== "" && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">
                  stdout
                </p>
                <pre className="max-h-48 overflow-auto rounded border border-border bg-surface p-3 font-mono text-sm text-foreground whitespace-pre-wrap wrap-break-word">
                  {result.stdout}
                </pre>
              </div>
            )}
            {result.stderr != null && result.stderr !== "" && (
              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted">
                  stderr
                </p>
                <pre className="max-h-48 overflow-auto rounded border border-border bg-surface p-3 font-mono text-sm text-red-600 dark:text-red-400 whitespace-pre-wrap wrap-break-word">
                  {result.stderr}
                </pre>
              </div>
            )}
            {(result.stdout == null || result.stdout === "") &&
              (result.stderr == null || result.stderr === "") && (
                <p className="text-sm text-muted">
                  Sin salida. Exit code: {result.exitCode ?? "-"}
                  {result.timedOut && " · Se superó el tiempo límite."}
                </p>
              )}
          </div>
        )}
      </section>
    </>
  );
}
