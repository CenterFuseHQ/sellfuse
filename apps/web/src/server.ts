import { createServer } from "node:http";
import { SELLFUSE_STEPS } from "./workflow.js";

const steps = SELLFUSE_STEPS.map(
  (step, index) => `<li><span>${index + 1}</span>${step}</li>`,
).join("");
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SellFuse — List once. Sell everywhere.</title><style>body{font-family:system-ui;margin:0;background:#f6f4ef;color:#17231d}main{max-width:760px;margin:auto;padding:64px 24px}h1{font-size:clamp(2.5rem,8vw,5rem);line-height:.95}p{font-size:1.2rem;line-height:1.6}ol{display:grid;gap:12px;padding:0;list-style:none}li{background:white;border:1px solid #d9dedb;border-radius:16px;padding:16px;display:flex;gap:14px;align-items:center}li span{background:#193f2d;color:white;border-radius:999px;width:28px;height:28px;display:grid;place-items:center}button{background:#e45b34;color:white;border:0;border-radius:999px;padding:14px 22px;font-weight:700}</style></head><body><main><p>AI selling assistant for ordinary people</p><h1>Take pictures.<br>Sell with confidence.</h1><p>SellFuse identifies what you have, separates real market evidence from AI reasoning, prepares every listing, and keeps you in control.</p><button>Start with photos</button><ol>${steps}</ol><p><strong>No reliable comps?</strong> SellFuse says so. You can always finish manually.</p></main></body></html>`;
createServer((_request, response) =>
  response
    .writeHead(200, { "content-type": "text/html; charset=utf-8" })
    .end(html),
).listen(Number(process.env.PORT ?? 3000), "127.0.0.1");
