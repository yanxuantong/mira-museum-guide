#!/usr/bin/env node
import { createReadStream } from "node:fs";
import { access, readFile } from "node:fs/promises";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadLocalEnv } from "./env.mjs";
import { createMiraVisitCard, getMiraVisitCard, loadMiraContext, statusSteps } from "./mira.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
loadLocalEnv(rootDir);
const port = Number(process.env.PORT || "4173");
const host = process.env.HOST || "127.0.0.1";

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url || "/", `http://${request.headers.host}`);
    if (request.method === "GET" && url.pathname === "/api/context") {
      return sendJson(response, {
        context: await loadMiraContext(rootDir),
        status_steps: statusSteps()
      });
    }
    if (request.method === "POST" && url.pathname === "/api/start-guide") {
      const body = await readJsonBody(request);
      const card = await createMiraVisitCard({
        rootDir,
        phone: body.phone,
        language: body.language || "en",
        imageName: body.image_name || "uploaded image",
        imageDataUrl: body.image_data_url || "",
        mode: "mock",
        liveLlm: process.env.MOCK_NEBIUS !== "true"
      });
      return sendJson(response, { visit_card: card });
    }
    if (request.method === "GET" && url.pathname.startsWith("/api/visit-card/")) {
      const visitCardId = decodeURIComponent(url.pathname.split("/").at(-1));
      const card = await getMiraVisitCard(rootDir, visitCardId);
      return sendJson(response, { visit_card: card });
    }

    return serveStatic(url.pathname, response);
  } catch (error) {
    const status = error?.code === "ENOENT" ? 404 : 500;
    return sendJson(
      response,
      {
        error: error instanceof Error ? error.message : "Unknown server error"
      },
      status
    );
  }
});

server.listen(port, host, () => {
  console.log(`Mira local demo running at http://${host}:${port}`);
  console.log("API: POST /api/start-guide, GET /api/visit-card/:id");
});

async function serveStatic(pathname, response) {
  if (pathname === "/favicon.ico") {
    response.writeHead(204);
    response.end();
    return;
  }
  const publicDir = path.join(rootDir, "public");
  const filePath =
    pathname === "/"
      ? path.join(publicDir, "index.html")
      : pathname.startsWith("/sample-data/")
        ? path.join(rootDir, pathname)
        : pathname.startsWith("/artifacts/")
          ? path.join(rootDir, pathname)
          : path.join(publicDir, pathname);

  const normalized = path.normalize(filePath);
  if (
    !normalized.startsWith(publicDir) &&
    !normalized.startsWith(path.join(rootDir, "sample-data")) &&
    !normalized.startsWith(path.join(rootDir, "artifacts"))
  ) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  const contentType = getContentType(normalized);
  await access(normalized);
  response.writeHead(200, { "Content-Type": contentType });
  const stream = createReadStream(normalized);
  stream.on("error", () => {
    if (!response.headersSent) response.writeHead(404);
    response.end("Not found");
  });
  stream.pipe(response);
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

function sendJson(response, payload, status = 200) {
  response.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store"
  });
  response.end(JSON.stringify(payload, null, 2));
}

function getContentType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".svg": "image/svg+xml"
  }[extension] || "application/octet-stream";
}
