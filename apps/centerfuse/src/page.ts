import { PRODUCTS, resolveProductUrls, type ProductUrls } from "@centerfuse/config";
import { renderDocument, renderFamilyFooter, renderFamilyHeader, renderState } from "@centerfuse/ui";

export function renderCenterFuseHome(urls: ProductUrls = resolveProductUrls({})): string {
  const body = `${renderFamilyHeader("CENTERFUSE", urls)}<main id="main">
  <section class="shell hero"><p class="eyebrow">One account. A growing family of useful tools.</p><h1 class="display">Bring buying and selling into focus.</h1><p class="lede">CenterFuse is the home of focused products that reduce the busywork around everyday commerce.</p><div class="row"><a class="button" href="${urls.SELLFUSE}">Start with SellFuse</a><a class="button outline" href="${urls.BUYFUSE}">Open BuyFuse</a></div></section>
  <section class="shell" aria-labelledby="products"><p class="eyebrow">Products</p><h2 id="products">Choose the tool for what you are doing today.</h2><div class="grid">
    <article class="card"><p class="eyebrow">For sellers</p><h2>SellFuse</h2><p>Turn photos and what you know into a reviewed master listing, then prepare it for the places you choose to sell.</p><a class="button" href="${urls.SELLFUSE}">Prepare a listing</a></article>
    <article class="card"><p class="eyebrow">For buyers</p><h2>BuyFuse</h2><p>Keep items you are considering, their source links, and the details you want to remember in one calm workspace.</p><a class="button" href="${urls.BUYFUSE}">Organize items</a></article>
  </div></section>
  <section class="shell hero"><div class="card"><p class="eyebrow">Designed to grow with you</p><h2>Shared identity. Purpose-built products.</h2><p class="lede">Each product has its own workflow and deployment boundary while CenterFuse provides a consistent account and product experience.</p></div></section>
  </main>${renderFamilyFooter(urls)}`;
  return renderDocument({ product: PRODUCTS.CENTERFUSE, title: "CenterFuse — Practical tools for buying and selling", description: "Meet SellFuse and BuyFuse, purpose-built CenterFuse products for everyday commerce.", body });
}

export function renderCenterFuseState(kind: "loading" | "error" | "not-found", urls: ProductUrls = resolveProductUrls({})): string {
  const state = kind === "loading" ? renderState("loading", "Loading CenterFuse", "Bringing your products together…") : kind === "error" ? renderState("error", "Something went wrong", "CenterFuse could not load this page. Try again shortly.") : renderState("empty", "Page not found", "The page you requested is not part of CenterFuse.");
  return renderDocument({ product: PRODUCTS.CENTERFUSE, title: `${kind === "not-found" ? "Page not found" : "CenterFuse"} — CenterFuse`, description: "CenterFuse application status", body: `${renderFamilyHeader("CENTERFUSE", urls)}<main id="main" class="shell hero">${state}<p><a class="button" href="${urls.CENTERFUSE}">Return home</a></p></main>${renderFamilyFooter(urls)}` });
}
