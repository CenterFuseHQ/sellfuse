/** Scoped SellFuse seller command-and-journey redesign. */
export const sellerStyles = `
.sf-page{--sf-ink:#112b24;--sf-muted:#536e62;--sf-bg:#f6f8f3;--sf-panel:#fff;--sf-line:#d9e5dd;--sf-forest:#164f39;--sf-coral:#c94f29;background:radial-gradient(circle at 95% 4%,#e0f2e5,transparent 35%),var(--sf-bg);color:var(--sf-ink);min-height:100vh;color-scheme:light}
.sf-page:has(#sf-dark:checked){--sf-ink:#f3fff5;--sf-muted:#c9dcd1;--sf-bg:#0f211d;--sf-panel:#1c3229;--sf-line:#406154;--sf-forest:#9ad8b5;--sf-coral:#ffb193;background:radial-gradient(circle at 95% 5%,#204134,transparent 35%),var(--sf-bg);color-scheme:dark}
.sf-page .family-nav{max-width:1120px}.sf-page .nav-links a:not([aria-current=page]){display:inline-flex}
.sf-page .family-nav .nav-links{flex-wrap:nowrap;overflow:auto;max-width:100%;justify-content:flex-start}
.sf-page main{max-width:1120px;padding:26px 20px 100px}
.sf-page :is(input,select,textarea){background:var(--sf-panel);color:var(--sf-ink);border-color:var(--sf-line)}
.sf-page .card,.sf-page .sf-feature,.sf-page .sf-demo{background:var(--sf-panel);border-color:var(--sf-line)}
.sf-page .card{box-shadow:0 14px 36px #0f3d1c12}.sf-page p,.sf-page .muted{color:var(--sf-muted)}
.sf-page button{background:#16523c;color:white;border-radius:11px}.sf-page button.secondary{background:#edf2e9;color:#143c2d}
.sf-page :is(a,button,textarea,input,select):focus-visible{outline:3px solid #e58a49;outline-offset:3px}
.sf-page .eyebrow{color:var(--sf-coral)}
.sf-page h1{font-size:clamp(2.9rem,6vw,5.8rem);letter-spacing:-.055em;line-height:1.03;max-width:13ch}
.sf-page .lede{max-width:37rem}
.sf-switch{display:flex;justify-content:flex-end;gap:.5rem;align-items:center;color:var(--sf-muted);font-size:.9rem;font-weight:700}
.sf-switch input{width:1.1rem;height:1.1rem;accent-color:#d66d41}
.sf-lead{display:grid;grid-template-columns:1.2fr .8fr;gap:2rem;align-items:center}
.sf-lead header{margin:0}
.sf-visual{border-radius:1.6rem;min-height:19rem;display:grid;gap:1rem;padding:1.3rem;border:1px solid var(--sf-line);background:linear-gradient(145deg,var(--sf-panel),rgba(66,145,97,.09))}
.sf-visual article{border:1px solid var(--sf-line);border-radius:1rem;padding:1rem;background:var(--sf-panel)}
.sf-visual .sf-circle{display:grid;place-items:center;border-radius:50%;width:2.6rem;height:2.6rem;background:#fff0e8;color:#b84f29;font-size:1.2rem;font-weight:900}
.sf-visual strong{display:block}.sf-visual small{color:var(--sf-muted)}
.sf-visual-flow{display:flex;gap:.6rem;align-items:center;color:var(--sf-muted);justify-content:center;font-weight:800}
.sf-journeys{display:grid;grid-template-columns:repeat(3,1fr);gap:.9rem;margin:2rem 0}
.sf-feature{border:1px solid var(--sf-line);border-radius:1.2rem;padding:1.2rem}
.sf-feature strong{font-size:1.1rem}.sf-feature p{line-height:1.55;margin:.45rem 0 0}
.sf-demo{border:1px solid var(--sf-line);border-radius:1.5rem;padding:clamp(1.2rem,3vw,2.2rem);margin:2.6rem 0}
.sf-demo h2{font-size:clamp(1.8rem,3vw,2.7rem);margin:.4rem 0}
.sf-demo-grid{display:grid;grid-template-columns:1fr 1fr;gap:1.3rem;margin-top:1.2rem}
.sf-demo-result{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.9;min-height:11rem;border:1px solid var(--sf-line);border-radius:1rem;padding:1rem;background:var(--sf-bg);color:var(--sf-ink)}
.sf-demo-badge{display:inline-flex;font-size:.78rem;font-weight:900;border-radius:99px;padding:.4rem .7rem;background:#fff2e6;color:#854415;letter-spacing:.03em}
.sf-page:has(#sf-dark:checked) .sf-demo-badge{background:#422b24;color:#ffca9e}
.sf-warning{border-left:4px solid #ce6b37;padding-left:1rem;font-size:.88rem;line-height:1.5}
.sf-page .steps{margin-top:2rem}.sf-page .step{background:var(--sf-panel);border:1px solid var(--sf-line);color:var(--sf-ink)}
.sf-page #capture,.sf-page #result,.sf-page #auth{scroll-margin-top:2rem}
.sf-page .family-footer{border-color:var(--sf-line)}
@media(max-width:43rem){.sf-lead,.sf-journeys,.sf-demo-grid{grid-template-columns:1fr}.sf-page .family-nav{display:grid;gap:1rem}.sf-page .nav-links{justify-content:flex-start}.sf-page main{padding:16px 14px 60px}}
@media(prefers-reduced-motion:reduce){.sf-page *{transition:none!important;animation:none!important;scroll-behavior:auto!important}}
`;
