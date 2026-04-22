export const AI_CONTEXT = `# razorpay-universal — AI Context Brief

You are integrating payments with the npm package \`razorpay-universal\`.
Use this document as the source of truth for imports, API shape, and behavior.

## What it is
A framework-agnostic Razorpay Checkout SDK for the browser, with
first-class, SSR-safe support for React, Vue 3, Next.js, Nuxt 3,
Angular (incl. Angular Universal), and plain Vanilla JS.

## Installation
\`\`\`bash
npm install razorpay-universal
# pnpm add razorpay-universal
# yarn add razorpay-universal
\`\`\`

Peer deps are optional: install only the framework you use. React, Vue,
and @angular/core are declared optional peer deps. Zero runtime deps.

## Entry points (exports map)
- \`razorpay-universal\`          — core (loader, checkout, types, errors)
- \`razorpay-universal/react\`    — \`useRazorpay()\` hook
- \`razorpay-universal/vue\`      — \`useRazorpay()\` composable
- \`razorpay-universal/angular\`  — \`RazorpayService\`, \`RazorpayModule.forRoot()\`
- \`razorpay-universal/vanilla\`  — \`RazorpayClient\` class
- UMD CDN build                   — \`window.RazorpayUniversal\` global

## Core principles
- Single source of truth for script injection (idempotent, singleton).
- SSR-safe everywhere: no DOM access during server rendering.
- Promise-based API wrapping Razorpay's native callback-based SDK.
- Per-framework entry points so tree-shaking works out of the box.
- Throws typed errors: \`RazorpayLoadError\` (load/timeout failures)
  and \`RazorpayCheckoutError\` (checkout failed, dismissed, or unavailable).

## React usage (Next.js: mark parent component as 'use client')
\`\`\`tsx
import { useRazorpay } from 'razorpay-universal/react';

function PayButton() {
  const { open, isReady, isLoading, error } = useRazorpay();
  async function pay() {
    // 1. Create the order on YOUR server (never in the browser).
    const order = await fetch('/api/razorpay/order', { method: 'POST' })
      .then((r) => r.json());
    // 2. Open the checkout.
    const result = await open({
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
      amount: order.amount,         // in paise for INR
      currency: 'INR',
      order_id: order.id,
      name: 'Acme Inc.',
      prefill: { email: 'jane@example.com' },
      theme: { color: '#528FF0' },
    });
    // 3. Verify razorpay_signature server-side.
    await fetch('/api/razorpay/verify', { method: 'POST', body: JSON.stringify(result) });
  }
  return <button disabled={!isReady || isLoading} onClick={pay}>Pay</button>;
}
\`\`\`

## Vue 3 / Nuxt 3 usage
\`\`\`ts
import { useRazorpay } from 'razorpay-universal/vue';
const { open, isReady, isLoading, error } = useRazorpay();
// isLoading / isReady / error are Vue refs
await open({ key: '...', amount: 50000, currency: 'INR', order_id: '...' });
\`\`\`

## Angular usage
\`\`\`ts
// app.module.ts
import { RazorpayModule } from 'razorpay-universal/angular';
@NgModule({ imports: [RazorpayModule.forRoot({ timeout: 8000 })] })
export class AppModule {}

// component.ts
import { RazorpayService } from 'razorpay-universal/angular';
constructor(private razorpay: RazorpayService) {}
async pay() {
  const result = await this.razorpay.open({
    key: 'rzp_test_xxx', amount: 50000, currency: 'INR', name: 'Acme',
  });
}
\`\`\`

## Vanilla JS usage
\`\`\`ts
import { RazorpayClient } from 'razorpay-universal/vanilla';
const client = new RazorpayClient();
const result = await client.open({
  key: 'rzp_test_xxx', amount: 50000, currency: 'INR',
});
\`\`\`

## UMD / CDN
\`\`\`html
<script src="https://unpkg.com/razorpay-universal/dist/index.umd.js"></script>
<script>
  const client = new RazorpayUniversal.RazorpayClient();
  client.open({ key: 'rzp_test_xxx', amount: 50000, currency: 'INR' });
</script>
\`\`\`

## Response shapes
Success: \`{ razorpay_payment_id, razorpay_order_id, razorpay_signature }\`
Failure: \`{ error: { code, description, source, step, reason, metadata } }\`

## \`open()\` behavior (all adapters)
- Resolves with \`RazorpaySuccessResponse\` when the checkout handler fires.
- Rejects with \`RazorpayCheckoutError\` when:
  - the user dismisses the modal, OR
  - Razorpay emits \`payment.failed\`, OR
  - the checkout cannot be instantiated / opened.
- Load failures bubble up as \`RazorpayLoadError\`.
- User-supplied \`handler\` and \`modal.ondismiss\` are preserved; the
  library wraps them, never replaces them.

## SSR safety
- React hook: triggers the loader inside \`useEffect\`. Safe in Next.js;
  mark the caller as a client component with \`'use client'\`.
- Vue composable: guards every \`window\`/\`document\` access. Safe inside
  Nuxt 3 \`<script setup>\`.
- Angular service: uses \`PLATFORM_ID\` + \`isPlatformBrowser\`; \`open()\`
  rejects on the server, \`load()\` is a no-op.

## \`RazorpayCheckoutOptions\` (key fields)
\`\`\`ts
interface RazorpayCheckoutOptions {
  key: string;                         // Razorpay key id (public)
  amount?: number | string;            // smallest currency unit (paise for INR)
  currency?: string;                   // 'INR', 'USD', ...
  order_id?: string;                   // server-created order id
  name?: string;
  description?: string;
  image?: string;
  prefill?: { name?, email?, contact?, method? };
  notes?: Record<string, string | number | boolean>;
  theme?: { color?, hide_topbar?, backdrop_color? };
  modal?: { ondismiss?, escape?, confirm_close?, backdropclose?, ... };
  retry?: { enabled?, max_count? };
  handler?: (response: RazorpaySuccessResponse) => void;
  timeout?: number;                    // Razorpay-side session timeout
  // …plus all other Razorpay checkout options
}
\`\`\`

## LoadScriptOptions (for the hook/service factory)
\`\`\`ts
interface LoadScriptOptions {
  timeout?: number;   // default 10000 (ms) before RazorpayLoadError
  scriptUrl?: string; // default https://checkout.razorpay.com/v1/checkout.js
}
\`\`\`

## IMPORTANT — server-side responsibilities
This package only drives the browser-side checkout flow. You MUST:
1. Create the \`order_id\` on your backend using your Razorpay secret.
2. Verify \`razorpay_signature\` on your backend using HMAC-SHA256
   over \`order_id + "|" + razorpay_payment_id\` with your secret.
3. Never ship your \`KEY_SECRET\` to the browser.

## Common patterns
- Guard \`open()\` with \`isReady\`/\`isLoading\` to prevent duplicate clicks.
- Capture dismissals as user intent, not as errors (the rejection will
  have \`message: "Razorpay checkout modal was dismissed by the user."\`).
- Persist the resolved payment id to your DB ONLY after server-side
  signature verification succeeds.
`;
