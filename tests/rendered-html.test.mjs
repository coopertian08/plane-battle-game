import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
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
}

test("server-renders the plane battle game shell", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>飞机大战<\/title>/i);
  assert.match(html, /<canvas/i);
  assert.match(html, /飞机大战/);
  assert.match(html, /开始战斗/);
  assert.match(html, /爆弹/);
  assert.match(html, /摇杆/);
  assert.doesNotMatch(html, /Codex/);
  assert.doesNotMatch(html, /react-loading-skeleton|codex-preview|Building your site/);
});

test("keeps the finished game free of starter preview code", async () => {
  const [css, page, layout] = await Promise.all([
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(page, /GAME_WIDTH = 480/);
  assert.match(page, /joystick-zone/);
  assert.match(page, /arrowleft/);
  assert.match(page, /dropBomb/);
  assert.match(layout, /title:\s*"飞机大战"/);
  assert.match(css, /mobile-controls/);
  assert.doesNotMatch(page + layout + css, /SkeletonPreview|codex-preview|Building your site/);
});
