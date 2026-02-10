# Sandbox para ejecución de código de usuario: Java, JavaScript, TypeScript, Python
FROM node:22-alpine

RUN apk add --no-cache python3 openjdk17-jdk

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev

COPY server.mjs ./

RUN addgroup -g 1001 -S sandbox && adduser -u 1001 -S sandbox -G sandbox
RUN chown -R sandbox:sandbox /app
USER sandbox

EXPOSE 3001
ENV PORT=3001
CMD ["node", "server.mjs"]
