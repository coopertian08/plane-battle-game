import { cp, mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const outDir = resolve(root, "dist", "github-pages");
const clientDir = resolve(root, "dist", "client");

function getBasePath() {
  if (process.env.GITHUB_PAGES_BASE_PATH !== undefined) {
    return process.env.GITHUB_PAGES_BASE_PATH.replace(/\/$/, "");
  }

  const [owner, repo] = (process.env.GITHUB_REPOSITORY ?? "").split("/");
  if (!owner || !repo || repo === `${owner}.github.io`) return "";
  return `/${repo}`;
}

function prefixRootAssetPaths(html, basePath) {
  if (!basePath) return html;
  return html
    .replaceAll("/assets/", `${basePath}/assets/`)
    .replaceAll('"/favicon.svg', `"${basePath}/favicon.svg`)
    .replaceAll('"/file.svg', `"${basePath}/file.svg`)
    .replaceAll('"/globe.svg', `"${basePath}/globe.svg`)
    .replaceAll('"/window.svg', `"${basePath}/window.svg`);
}

await mkdir(outDir, { recursive: true });
await cp(clientDir, outDir, { recursive: true, force: true });

const workerUrl = new URL("../dist/server/index.js", import.meta.url);
workerUrl.searchParams.set("github-pages-export", `${process.pid}-${Date.now()}`);
const { default: worker } = await import(workerUrl.href);

const response = await worker.fetch(
  new Request("http://localhost/", {
    headers: { accept: "text/html" },
  }),
  {
    ASSETS: {
      fetch: async () => new Response("Not found", { status: 404 }),
    },
  },
  {
    waitUntil() {},
    passThroughOnException() {},
  },
);

if (!response.ok) {
  throw new Error(`Failed to render static page: ${response.status}`);
}

const basePath = getBasePath();
const html = prefixRootAssetPaths(await response.text(), basePath);

await writeFile(resolve(outDir, "index.html"), html);
await writeFile(resolve(outDir, "404.html"), html);
await writeFile(resolve(outDir, ".nojekyll"), "");

console.log(`Exported GitHub Pages site to ${outDir}${basePath ? ` with base path ${basePath}` : ""}`);
