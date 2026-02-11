# Stage 1: Obtener JARs de Selenium para Java
FROM maven:3.9-eclipse-temurin-17-alpine AS selenium-deps
WORKDIR /tmp/sel
RUN printf '%s\n' \
  '<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">' \
  '  <modelVersion>4.0.0</modelVersion><groupId>t</groupId><artifactId>t</artifactId><version>1</version>' \
  '  <dependencies><dependency><groupId>org.seleniumhq.selenium</groupId><artifactId>selenium-java</artifactId><version>4.15.0</version></dependency></dependencies>' \
  '</project>' > pom.xml
RUN mvn -q dependency:copy-dependencies -DoutputDirectory=/out
RUN mv /out /selenium-jars

# Stage 2: Sandbox con Node, Python, Java, Chromium, Selenium y Playwright
FROM node:22-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    chromium \
    openjdk-17-jdk \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Selenium y Playwright para Python
RUN pip3 install --break-system-packages selenium playwright \
    && python3 -m playwright install chromium

# JARs de Selenium para Java (desde stage 1)
COPY --from=selenium-deps /selenium-jars /app/selenium

WORKDIR /app

COPY sandbox/package.json ./
RUN npm install --omit=dev

# Cypress: instalar binario en /app para que el usuario sandbox lo encuentre
ENV CYPRESS_CACHE_FOLDER=/app/.cache/Cypress
RUN npx cypress install

# Playwright: instalar navegador Chromium en /app para que el usuario sandbox lo use
ENV PLAYWRIGHT_BROWSERS_PATH=/app/playwright-browsers
RUN npx playwright install chromium --with-deps

COPY sandbox/server.mjs ./
COPY sandbox/cypress.config.js ./

RUN addgroup --system --gid 1001 sandbox && adduser --system --uid 1001 --gid 1001 sandbox
RUN chown -R sandbox:sandbox /app

# Chromium del sistema para Selenium (Python/Java)
ENV CHROME_BIN=/usr/bin/chromium
ENV CHROMIUM_FLAGS="--no-sandbox --headless --disable-gpu --disable-dev-shm-usage"

# HOME escribible para que Selenium (Node) pueda crear ~/.cache/selenium
ENV HOME=/app

USER sandbox

EXPOSE 3001
ENV PORT=3001
CMD ["node", "server.mjs"]
