import { PRODUCTS, type ProductId, type ProductMetadata, type ProductUrls } from "@centerfuse/config";

export const designTokens = {
  font: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  space: { xs: "0.35rem", sm: "0.65rem", md: "1rem", lg: "1.5rem", xl: "2.5rem", xxl: "4.5rem" },
  radius: { sm: "0.65rem", md: "1rem", lg: "1.5rem", pill: "999px" },
  breakpoint: { sm: "36rem", md: "52rem", lg: "72rem" },
} as const;

export function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

export function familyStyles(product: ProductMetadata): string {
  return `:root{--ink:#17231d;--muted:#607068;--paper:#f6f4ee;--surface:#fff;--line:#dbe1dc;--accent:${product.accent};--theme:${product.themeColor};--shadow:0 18px 50px #17231d12;font-family:${designTokens.font};color:var(--ink);background:var(--paper)}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 90% 0,#ffffff 0,transparent 35%),var(--paper)}a{color:inherit}button,input,textarea,select{font:inherit}button,.button{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;border:0;border-radius:${designTokens.radius.pill};padding:.78rem 1.15rem;background:var(--theme);color:#fff;font-weight:800;text-decoration:none;cursor:pointer}.button.secondary{background:#edf1ed;color:var(--ink)}.button.outline{background:transparent;color:var(--theme);border:1px solid var(--line)}.shell{width:min(72rem,calc(100% - 2rem));margin:auto}.family-nav{display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:1rem 0}.brand{font-size:1.1rem;font-weight:900;text-decoration:none;letter-spacing:-.03em}.brand span{color:var(--accent)}.nav-links{display:flex;align-items:center;gap:.45rem;flex-wrap:wrap}.nav-links a{padding:.6rem .75rem;border-radius:${designTokens.radius.pill};text-decoration:none;font-weight:700}.nav-links a[aria-current=page]{background:#fff;box-shadow:0 1px 8px #17231d12}.hero{padding:clamp(3.5rem,10vw,7.5rem) 0 4rem}.eyebrow{text-transform:uppercase;letter-spacing:.1em;color:var(--accent);font-size:.78rem;font-weight:900}.display{font-size:clamp(3rem,8vw,6.5rem);line-height:.92;letter-spacing:-.075em;margin:.18em 0}.lede{font-size:clamp(1.05rem,2vw,1.3rem);line-height:1.65;max-width:45rem;color:#34443c}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,18rem),1fr));gap:1rem}.card{background:var(--surface);border:1px solid var(--line);border-radius:${designTokens.radius.lg};padding:clamp(1.2rem,3vw,2rem);box-shadow:var(--shadow)}.card h2,.card h3{margin-top:0}.stack{display:grid;gap:1rem}.row{display:flex;align-items:center;gap:.75rem;flex-wrap:wrap}.field{display:grid;gap:.42rem;font-weight:750}.field input,.field textarea,.field select{width:100%;border:1px solid #aebbb4;border-radius:${designTokens.radius.sm};padding:.78rem;background:#fff}.field textarea{min-height:7rem}.state{border:1px dashed #b8c4bc;border-radius:${designTokens.radius.lg};padding:2rem;text-align:center;background:#ffffff99}.state.error{border-style:solid;border-color:#df9e8b;background:#fff3ef}.state.loading{animation:pulse 1.4s ease-in-out infinite}.toast{position:fixed;right:1rem;bottom:1rem;max-width:24rem;background:var(--theme);color:#fff;padding:1rem 1.2rem;border-radius:${designTokens.radius.md};box-shadow:var(--shadow)}dialog{border:1px solid var(--line);border-radius:${designTokens.radius.lg};padding:0;max-width:34rem;width:calc(100% - 2rem)}dialog::backdrop{background:#0c181288}.dialog-body{padding:1.5rem}.skip-link{position:absolute;left:-999px;top:.5rem}.skip-link:focus{left:.5rem;background:#fff;padding:.7rem;z-index:10}.family-footer{border-top:1px solid var(--line);margin-top:5rem;padding:2rem 0;color:var(--muted)}@keyframes pulse{50%{opacity:.55}}@media(max-width:42rem){.family-nav{align-items:flex-start}.nav-links{justify-content:flex-end}.nav-links a:not([aria-current=page]){display:none}}@media(prefers-reduced-motion:reduce){*{scroll-behavior:auto!important;animation-duration:.01ms!important}}`;
}

export function renderFamilyHeader(current: ProductId, urls: ProductUrls): string {
  const links = (Object.keys(PRODUCTS) as ProductId[]).map((id) => `<a href="${escapeHtml(urls[id])}"${id === current ? ' aria-current="page"' : ""}>${PRODUCTS[id].name}</a>`).join("");
  return `<a class="skip-link" href="#main">Skip to content</a><header class="shell family-nav"><a class="brand" href="${escapeHtml(urls.CENTERFUSE)}">Center<span>Fuse</span></a><nav class="nav-links" aria-label="CenterFuse products">${links}</nav></header>`;
}

export function renderFamilyFooter(urls: ProductUrls): string {
  return `<footer class="family-footer"><div class="shell row"><strong>CenterFuse</strong><span>Practical tools for buying and selling.</span><a href="${escapeHtml(urls.SELLFUSE)}">SellFuse</a><a href="${escapeHtml(urls.BUYFUSE)}">BuyFuse</a></div></footer>`;
}

export function renderState(kind: "loading" | "empty" | "error", title: string, detail: string): string {
  return `<section class="state ${kind}" role="${kind === "error" ? "alert" : "status"}"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(detail)}</p></section>`;
}

export function renderDialog(id: string, title: string, body: string): string {
  return `<dialog id="${escapeHtml(id)}" aria-labelledby="${escapeHtml(id)}-title"><div class="dialog-body"><h2 id="${escapeHtml(id)}-title">${escapeHtml(title)}</h2>${body}<form method="dialog"><button class="button secondary">Close</button></form></div></dialog>`;
}

export function renderDocument(input: { product: ProductMetadata; title: string; description: string; body: string; scripts?: string }): string {
  const favicon = encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="${input.product.themeColor}"/><path d="M18 20h30v8H27v7h17v8H27v13h-9z" fill="white"/></svg>`);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(input.title)}</title><meta name="description" content="${escapeHtml(input.description)}"><meta name="theme-color" content="${input.product.themeColor}"><link rel="manifest" href="/manifest.webmanifest"><link rel="icon" href="data:image/svg+xml,${favicon}"><style>[hidden]{display:none!important}${familyStyles(input.product)}</style></head><body>${input.body}${input.scripts ? `<script>${input.scripts}</script>` : ""}</body></html>`;
}
