import { useEffect, useMemo, useRef, useState } from 'react';
import { AI_CONTEXT } from './lib/aiContext';
import './App.css';

type FrameworkKey = 'react' | 'vue' | 'angular' | 'vanilla';

const CODE_SAMPLES: Record<FrameworkKey, { label: string; path: string; code: string }> = {
  react: {
    label: 'React · Next.js',
    path: "razorpay-universal/react",
    code: `import { useRazorpay } from 'razorpay-universal/react';

export function PayButton() {
  const { open, isReady, isLoading } = useRazorpay();

  async function pay() {
    const order = await fetch('/api/order', { method: 'POST' })
      .then((r) => r.json());

    const result = await open({
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
      amount: order.amount,
      currency: 'INR',
      order_id: order.id,
      name: 'Acme Inc.',
      prefill: { email: 'jane@example.com' },
      theme: { color: '#DC2E1E' },
    });

    await fetch('/api/verify', {
      method: 'POST',
      body: JSON.stringify(result),
    });
  }

  return (
    <button disabled={!isReady || isLoading} onClick={pay}>
      Pay with Razorpay
    </button>
  );
}`,
  },
  vue: {
    label: 'Vue · Nuxt',
    path: "razorpay-universal/vue",
    code: `<script setup lang="ts">
import { useRazorpay } from 'razorpay-universal/vue';

const { open, isReady, isLoading } = useRazorpay();

async function pay() {
  const order = await fetch('/api/order', { method: 'POST' })
    .then((r) => r.json());

  const result = await open({
    key: import.meta.env.VITE_RAZORPAY_KEY_ID,
    amount: order.amount,
    currency: 'INR',
    order_id: order.id,
    name: 'Acme Inc.',
  });

  await fetch('/api/verify', {
    method: 'POST',
    body: JSON.stringify(result),
  });
}
</script>

<template>
  <button :disabled="!isReady || isLoading" @click="pay">
    Pay with Razorpay
  </button>
</template>`,
  },
  angular: {
    label: 'Angular',
    path: "razorpay-universal/angular",
    code: `import { NgModule } from '@angular/core';
import { RazorpayModule, RazorpayService }
  from 'razorpay-universal/angular';

@NgModule({
  imports: [RazorpayModule.forRoot({ timeout: 8000 })],
})
export class AppModule {}

@Component({ selector: 'app-pay', /* ... */ })
export class PayComponent {
  constructor(private razorpay: RazorpayService) {}

  async pay() {
    const result = await this.razorpay.open({
      key: 'rzp_test_xxx',
      amount: 50000,
      currency: 'INR',
      name: 'Acme Inc.',
    });
    // POST result to your server for signature verification
  }
}`,
  },
  vanilla: {
    label: 'Vanilla · CDN',
    path: "razorpay-universal/vanilla",
    code: `import { RazorpayClient } from 'razorpay-universal/vanilla';

const client = new RazorpayClient({ timeout: 8000 });

document.querySelector('#pay')!.addEventListener('click', async () => {
  try {
    const result = await client.open({
      key: 'rzp_test_xxx',
      amount: 50000,
      currency: 'INR',
      name: 'Acme Inc.',
    });
    console.log(result);
  } catch (err) {
    console.error(err);
  }
});

/* UMD (via <script src=".../index.umd.js"></script>):
   const client = new RazorpayUniversal.RazorpayClient();
   client.open({ ... }); */`,
  },
};

const FRAMEWORKS = [
  { name: 'REACT', version: '≥ 17' },
  { name: 'VUE 3', version: '≥ 3.0' },
  { name: 'NEXT.JS', version: 'App + Pages' },
  { name: 'NUXT 3', version: '≥ 3.0' },
  { name: 'ANGULAR', version: '≥ 14, incl. Universal' },
  { name: 'VANILLA JS', version: 'ESM · CJS · UMD' },
];

const FEATURES = [
  {
    n: '01',
    title: 'Promise-based',
    body:
      'A single await wraps Razorpay’s callback SDK. Success resolves, dismissal rejects, payment.failed rejects — nothing is swallowed.',
  },
  {
    n: '02',
    title: 'SSR-safe everywhere',
    body:
      'No window access during server rendering. Next.js, Nuxt 3, and Angular Universal are first-class, not afterthoughts.',
  },
  {
    n: '03',
    title: 'Zero runtime deps',
    body:
      'React, Vue, and @angular/core are optional peer deps. The package itself ships nothing else you have to audit.',
  },
  {
    n: '04',
    title: 'Singleton loader',
    body:
      'Call loadRazorpayScript() from fifty components if you want. One script tag, one promise, memoized forever.',
  },
  {
    n: '05',
    title: 'Typed down to the stamp',
    body:
      'RazorpayCheckoutOptions, RazorpaySuccessResponse, RazorpayFailureResponse. Strict-mode TypeScript with no escape hatches.',
  },
  {
    n: '06',
    title: 'Per-framework entry points',
    body:
      'razorpay-universal/react, /vue, /angular, /vanilla. Tree-shaking works; you never pay for adapters you don’t import.',
  },
];

function useCopy(): [boolean, (text: string) => Promise<void>] {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
  }, []);

  const copy = async (text: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const el = document.createElement('textarea');
      el.value = text;
      el.setAttribute('readonly', '');
      el.style.position = 'absolute';
      el.style.left = '-9999px';
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }
    setCopied(true);
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setCopied(false), 2000);
  };

  return [copied, copy];
}

export default function App() {
  const [active, setActive] = useState<FrameworkKey>('react');
  const [aiCopied, copyAi] = useCopy();
  const [installCopied, copyInstall] = useCopy();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const onScroll = (): void => setScrollY(window.scrollY);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const headerInk = useMemo(() => Math.min(1, scrollY / 180), [scrollY]);

  return (
    <div className="page">
      <div className="grain" aria-hidden="true" />

      {/* -------------------------- top ticker -------------------------- */}
      <div className="ticker" aria-hidden="true">
        <div className="ticker-track">
          {Array.from({ length: 3 }).map((_, i) => (
            <span key={i} className="ticker-row">
              <span>RAZORPAY-UNIVERSAL · v1.0.0</span>
              <span className="diamond">◆</span>
              <span>REACT</span>
              <span className="diamond">◆</span>
              <span>VUE</span>
              <span className="diamond">◆</span>
              <span>NEXT</span>
              <span className="diamond">◆</span>
              <span>NUXT</span>
              <span className="diamond">◆</span>
              <span>ANGULAR</span>
              <span className="diamond">◆</span>
              <span>VANILLA</span>
              <span className="diamond">◆</span>
              <span>ZERO RUNTIME DEPS</span>
              <span className="diamond">◆</span>
              <span>MIT</span>
              <span className="diamond">◆</span>
            </span>
          ))}
        </div>
      </div>

      {/* ---------------------------- nav ---------------------------- */}
      <header
        className="nav"
        style={{
          borderBottomColor: `rgba(15,15,14,${0.08 + headerInk * 0.22})`,
        }}
      >
        <a href="#top" className="brand">
          <span className="brand-mark">▮</span>
          <span>razorpay-universal</span>
        </a>
        <nav className="nav-links">
          <a href="#frameworks">frameworks</a>
          <a href="#examples">examples</a>
          <a href="#features">features</a>
          <a href="#api">api</a>
          <a
            className="nav-ghost"
            href="https://github.com/"
            target="_blank"
            rel="noreferrer"
          >
            github ↗
          </a>
        </nav>
      </header>

      {/* ---------------------------- hero --------------------------- */}
      <section className="hero" id="top">
        <div className="hero-grid">
          <div className="hero-copy">
            <div className="eyebrow">
              <span>v1.0.0</span>
              <span className="dot" />
              <span>TypeScript</span>
              <span className="dot" />
              <span>SSR-safe</span>
            </div>

            <h1 className="h1">
              <span className="h1-row h1-delay-1">One checkout.</span>
              <span className="h1-row h1-delay-2">
                <em>every</em> framework.
              </span>
            </h1>

            <p className="lede h1-delay-3">
              <span className="dropcap">A</span>
              promise-based Razorpay Checkout SDK with first-class adapters
              for React, Vue&nbsp;3, Next.js, Nuxt&nbsp;3, Angular, and Vanilla JS —
              wrapped in a single, idempotent script loader.
            </p>

            <div className="cta-row h1-delay-4">
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => copyAi(AI_CONTEXT)}
                aria-live="polite"
              >
                <span className="btn-inner">
                  <span className="btn-mark">◎</span>
                  <span className="btn-label">
                    {aiCopied ? 'copied to clipboard' : 'copy context for ai'}
                  </span>
                  <span className="btn-arrow">{aiCopied ? '✓' : '→'}</span>
                </span>
                <span className="btn-sub">
                  {aiCopied
                    ? 'paste into claude code, cursor, or any agent'
                    : 'a full SDK briefing your coding agent can ingest'}
                </span>
              </button>

              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => copyInstall('npm install razorpay-universal')}
              >
                <span className="cmd">
                  <span className="cmd-prompt">$</span>
                  npm install razorpay-universal
                </span>
                <span className="btn-sub">
                  {installCopied ? 'copied ✓' : 'click to copy'}
                </span>
              </button>
            </div>
          </div>

          {/* ------------------------ receipt ------------------------ */}
          <aside className="receipt" aria-label="Supported frameworks">
            <div className="receipt-perf receipt-perf-top" />
            <div className="receipt-body">
              <div className="receipt-head">
                <div className="receipt-logo">◎</div>
                <div>
                  <div className="receipt-title">RAZORPAY / UNIVERSAL</div>
                  <div className="receipt-sub">RECEIPT · NO. 001 · v1.0.0</div>
                </div>
              </div>

              <div className="receipt-rule" />

              <div className="receipt-meta">
                <span>ISSUED</span>
                <span>→</span>
                <span>DEVELOPER, YOU</span>
              </div>
              <div className="receipt-meta">
                <span>FOR</span>
                <span>→</span>
                <span>SHIPPING PAYMENTS</span>
              </div>

              <div className="receipt-rule receipt-rule-dashed" />

              <ul className="receipt-list">
                {FRAMEWORKS.map((f) => (
                  <li key={f.name}>
                    <span className="rl-name">{f.name}</span>
                    <span className="rl-dots" aria-hidden="true" />
                    <span className="rl-price">
                      <span className="rl-check">✓</span>
                      &nbsp;INSTALLED
                    </span>
                    <span className="rl-version">{f.version}</span>
                  </li>
                ))}
              </ul>

              <div className="receipt-rule receipt-rule-dashed" />

              <div className="receipt-line">
                <span>TYPESCRIPT</span>
                <span>INCLUDED</span>
              </div>
              <div className="receipt-line">
                <span>SSR-SAFE</span>
                <span>INCLUDED</span>
              </div>
              <div className="receipt-line">
                <span>TREE-SHAKABLE</span>
                <span>INCLUDED</span>
              </div>
              <div className="receipt-line">
                <span>RUNTIME DEPS</span>
                <span>0</span>
              </div>

              <div className="receipt-rule" />

              <div className="receipt-total">
                <span>TOTAL DUE</span>
                <span>FREE · MIT</span>
              </div>

              <div className="receipt-barcode" aria-hidden="true">
                {Array.from({ length: 42 }).map((_, i) => (
                  <span
                    key={i}
                    className="bc"
                    style={{
                      width: `${[1, 2, 1, 3, 1, 2, 4, 1, 2, 1][i % 10]}px`,
                    }}
                  />
                ))}
              </div>
              <div className="receipt-footnote">
                thank you — now go verify <em>razorpay_signature</em> server-side.
              </div>
            </div>
            <div className="receipt-perf receipt-perf-bottom" />
          </aside>
        </div>

        <div
          className="stamp"
          role="img"
          aria-label="Ship ready, version 1 point 0"
        >
          <div className="stamp-inner">
            <span>SHIP</span>
            <span>READY</span>
            <span className="stamp-v">v · 1 · 0</span>
          </div>
        </div>
      </section>

      {/* ----------------------- frameworks ---------------------- */}
      <section id="frameworks" className="frameworks">
        <div className="section-head">
          <span className="section-num">§ 01</span>
          <h2 className="h2">Six runtimes, one API.</h2>
          <p className="section-lede">
            The adapter is the thinnest possible layer on top of a shared
            core. Import only what you use; the rest is never parsed.
          </p>
        </div>

        <ul className="fw-grid">
          {FRAMEWORKS.map((f, i) => (
            <li key={f.name} className="fw-card" style={{ '--i': i } as React.CSSProperties}>
              <div className="fw-num">{String(i + 1).padStart(2, '0')}</div>
              <div className="fw-name">{f.name}</div>
              <div className="fw-version">{f.version}</div>
            </li>
          ))}
        </ul>
      </section>

      {/* --------------------- code examples --------------------- */}
      <section id="examples" className="examples">
        <div className="section-head">
          <span className="section-num">§ 02</span>
          <h2 className="h2">
            Same <em>open()</em>, every framework.
          </h2>
          <p className="section-lede">
            The hook, the composable, the service, and the class all return
            the same Promise. Choose a flavor.
          </p>
        </div>

        <div className="tabs" role="tablist">
          {(Object.keys(CODE_SAMPLES) as FrameworkKey[]).map((k) => (
            <button
              key={k}
              role="tab"
              aria-selected={active === k}
              className={`tab ${active === k ? 'tab-active' : ''}`}
              onClick={() => setActive(k)}
            >
              {CODE_SAMPLES[k].label}
            </button>
          ))}
        </div>

        <div className="terminal" aria-live="polite">
          <div className="terminal-chrome">
            <span className="dot dot-red" />
            <span className="dot dot-amber" />
            <span className="dot dot-green" />
            <span className="terminal-title">
              {CODE_SAMPLES[active].path}
            </span>
          </div>
          <pre className="terminal-body">
            <code>{CODE_SAMPLES[active].code}</code>
          </pre>
        </div>
      </section>

      {/* -------------------- features / why --------------------- */}
      <section id="features" className="features">
        <div className="section-head">
          <span className="section-num">§ 03</span>
          <h2 className="h2">Opinionated where it counts.</h2>
        </div>

        <ul className="feature-grid">
          {FEATURES.map((f) => (
            <li key={f.n} className="feature-card">
              <div className="feature-n">{f.n}</div>
              <h3 className="feature-title">{f.title}</h3>
              <p className="feature-body">{f.body}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* ------------------ editorial / philosophy ------------------ */}
      <section className="editorial">
        <div className="editorial-inner">
          <div className="edi-kicker">Aside</div>
          <p className="edi-p">
            <span className="dropcap">P</span>
            ayment SDKs tend to bloat: framework adapters bundled together,
            hidden singletons, side-effectful imports, and a script tag that
            gets re-injected on every page transition. <em>razorpay-universal</em>
            &nbsp;is the opposite — a single loader at the core, thin adapters
            that wrap it with framework-native ergonomics, and a promise
            returned where Razorpay returned a callback.
          </p>
          <p className="edi-p">
            Because the surface area is small, it is easy to audit. Because
            the adapters share a core, they are impossible to drift apart.
            Because each entry point is its own bundle, nothing you skip
            ships to your users.
          </p>
        </div>
      </section>

      {/* --------------------------- api --------------------------- */}
      <section id="api" className="api">
        <div className="section-head">
          <span className="section-num">§ 04</span>
          <h2 className="h2">The API, in one table.</h2>
        </div>

        <div className="api-table" role="table">
          <div className="api-row api-head" role="row">
            <span>export</span>
            <span>entry point</span>
            <span>shape</span>
          </div>

          <div className="api-row" role="row">
            <span className="api-name">loadRazorpayScript</span>
            <span className="api-path">razorpay-universal</span>
            <span className="api-sig">
              (opts?: LoadScriptOptions) ⇒ Promise&lt;void&gt;
            </span>
          </div>
          <div className="api-row" role="row">
            <span className="api-name">openCheckout</span>
            <span className="api-path">razorpay-universal</span>
            <span className="api-sig">
              (opts) ⇒ Promise&lt;RazorpaySuccessResponse&gt;
            </span>
          </div>
          <div className="api-row" role="row">
            <span className="api-name">createCheckout</span>
            <span className="api-path">razorpay-universal</span>
            <span className="api-sig">(opts) ⇒ Promise&lt;RazorpayInstance&gt;</span>
          </div>
          <div className="api-row" role="row">
            <span className="api-name">useRazorpay</span>
            <span className="api-path">razorpay-universal/react</span>
            <span className="api-sig">
              (opts?) ⇒ {'{ open, close, isReady, isLoading, error }'}
            </span>
          </div>
          <div className="api-row" role="row">
            <span className="api-name">useRazorpay</span>
            <span className="api-path">razorpay-universal/vue</span>
            <span className="api-sig">
              (opts?) ⇒ {'{ open, close, isReady: Ref, isLoading: Ref, error: Ref }'}
            </span>
          </div>
          <div className="api-row" role="row">
            <span className="api-name">RazorpayService</span>
            <span className="api-path">razorpay-universal/angular</span>
            <span className="api-sig">
              {'{ load(), open(), close(), isReady() }'}
            </span>
          </div>
          <div className="api-row" role="row">
            <span className="api-name">RazorpayClient</span>
            <span className="api-path">razorpay-universal/vanilla</span>
            <span className="api-sig">
              {'new (opts?) → { load, open, close, isReady }'}
            </span>
          </div>
        </div>

        <div className="warning">
          <span className="warning-label">▲ MUST READ</span>
          <span>
            Order creation and <em>razorpay_signature</em> verification
            happen <strong>server-side</strong>, with your Razorpay secret
            key. The browser never sees KEY_SECRET.
          </span>
        </div>
      </section>

      {/* -------------------------- CTA --------------------------- */}
      <section className="final-cta">
        <h2 className="cta-h">Your agent will thank you.</h2>
        <p className="cta-p">
          One click. A complete SDK briefing in your clipboard.
          Paste it into Claude Code, Cursor, or any coding agent and it
          can write correct integration code on the first try.
        </p>
        <button
          type="button"
          className="btn btn-primary btn-lg"
          onClick={() => copyAi(AI_CONTEXT)}
        >
          <span className="btn-inner">
            <span className="btn-mark">◎</span>
            <span className="btn-label">
              {aiCopied ? 'copied to clipboard' : 'copy context for ai'}
            </span>
            <span className="btn-arrow">{aiCopied ? '✓' : '→'}</span>
          </span>
        </button>
      </section>

      {/* -------------------------- footer -------------------------- */}
      <footer className="footer">
        <div className="footer-row">
          <span className="footer-brand">◎ razorpay-universal</span>
          <span className="footer-mid">
            built for developers who ship · MIT · 2026
          </span>
          <span className="footer-ver">v 1.0.0</span>
        </div>
        <div className="footer-sub">
          not affiliated with Razorpay. just a thin, opinionated SDK.
        </div>
      </footer>
    </div>
  );
}
