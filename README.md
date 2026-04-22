# razorpay-universal

[![npm version](https://img.shields.io/npm/v/razorpay-universal.svg)](https://www.npmjs.com/package/razorpay-universal)
[![npm downloads](https://img.shields.io/npm/dm/razorpay-universal.svg)](https://www.npmjs.com/package/razorpay-universal)
[![license](https://img.shields.io/npm/l/razorpay-universal.svg)](https://github.com/Rupam-Shil/razorpay-universal/blob/main/LICENSE)

A framework-agnostic Razorpay checkout SDK with first-class support for **React**, **Vue 3**, **Next.js**, **Nuxt 3**, **Angular**, and **Vanilla JS**, fully typed in TypeScript.

- Single script loader shared across every adapter (singleton, idempotent).
- SSR-safe — never touches the DOM during server rendering.
- Promise-based `open()` API wrapping Razorpay's callback-based SDK.
- Separate entry points per framework so you only pay for what you import.
- Zero runtime dependencies; React / Vue / Angular are optional peer deps.

> **Important:** Creating orders, verifying the `razorpay_signature`, and issuing refunds **must** be done on your server using your secret key. This package only handles the browser-side checkout flow.

---

## Installation

```bash
npm install razorpay-universal
# or
pnpm add razorpay-universal
# or
yarn add razorpay-universal
```

---

## React

```tsx
import { useRazorpay } from 'razorpay-universal/react';

export function PayButton() {
  const { open, isReady, isLoading, error } = useRazorpay();

  async function handlePay() {
    const order = await fetch('/api/razorpay/order', { method: 'POST' }).then(
      (r) => r.json(),
    );

    try {
      const result = await open({
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
        amount: order.amount,
        currency: 'INR',
        order_id: order.id,
        name: 'Acme Inc.',
        description: 'Pro plan',
        prefill: { email: 'jane@example.com' },
        theme: { color: '#528FF0' },
      });

      await fetch('/api/razorpay/verify', {
        method: 'POST',
        body: JSON.stringify(result),
      });
    } catch (err) {
      console.error(err);
    }
  }

  if (error) return <p>Couldn't load Razorpay: {error.message}</p>;

  return (
    <button onClick={handlePay} disabled={!isReady || isLoading}>
      {isLoading ? 'Loading...' : 'Pay'}
    </button>
  );
}
```

---

## Vue 3

```vue
<script setup lang="ts">
import { useRazorpay } from 'razorpay-universal/vue';

const { open, isReady, isLoading, error } = useRazorpay();

async function pay() {
  const order = await fetch('/api/razorpay/order', { method: 'POST' }).then(
    (r) => r.json(),
  );

  const result = await open({
    key: import.meta.env.VITE_RAZORPAY_KEY_ID,
    amount: order.amount,
    currency: 'INR',
    order_id: order.id,
    name: 'Acme Inc.',
  });

  await fetch('/api/razorpay/verify', {
    method: 'POST',
    body: JSON.stringify(result),
  });
}
</script>

<template>
  <button :disabled="!isReady || isLoading" @click="pay">
    {{ isLoading ? 'Loading…' : 'Pay' }}
  </button>
  <p v-if="error">{{ error.message }}</p>
</template>
```

---

## Next.js

Works out of the box in both the **App Router** and **Pages Router**. Make sure the component using `useRazorpay` is a client component.

```tsx
// app/components/PayButton.tsx
'use client';

import { useRazorpay } from 'razorpay-universal/react';

export default function PayButton() {
  const { open, isReady } = useRazorpay();
  // ...
}
```

The hook is SSR-safe: it doesn't touch `window` during server rendering and only injects the Razorpay script on the client after mount.

---

## Nuxt 3

```vue
<!-- components/PayButton.vue -->
<script setup lang="ts">
import { useRazorpay } from 'razorpay-universal/vue';

const { open, isReady } = useRazorpay();
</script>
```

`useRazorpay` checks `typeof window !== 'undefined'` so it's safe to import in `<script setup>` blocks rendered on the server — the script is only loaded in the browser.

---

## Angular (incl. Angular Universal)

`app.module.ts`:

```ts
import { NgModule } from '@angular/core';
import { RazorpayModule } from 'razorpay-universal/angular';

@NgModule({
  imports: [RazorpayModule.forRoot({ timeout: 8000 })],
})
export class AppModule {}
```

`pay.component.ts`:

```ts
import { Component } from '@angular/core';
import { RazorpayService } from 'razorpay-universal/angular';

@Component({
  selector: 'app-pay',
  template: `<button (click)="pay()" [disabled]="!service.isReady()">Pay</button>`,
})
export class PayComponent {
  constructor(public service: RazorpayService) {}

  async pay() {
    const result = await this.service.open({
      key: 'rzp_test_xxx',
      amount: 50000,
      currency: 'INR',
      name: 'Acme Inc.',
    });
    // POST result to your server for verification
  }
}
```

The service uses `PLATFORM_ID` and `isPlatformBrowser` under the hood, so it's a no-op during Angular Universal SSR.

---

## Vanilla JS (ESM)

```ts
import { RazorpayClient } from 'razorpay-universal/vanilla';

const client = new RazorpayClient();

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
```

## Vanilla JS (UMD / CDN)

```html
<script src="https://unpkg.com/razorpay-universal/dist/index.umd.js"></script>
<script>
  const client = new RazorpayUniversal.RazorpayClient();
  document.querySelector('#pay').addEventListener('click', async () => {
    const result = await client.open({
      key: 'rzp_test_xxx',
      amount: 50000,
      currency: 'INR',
      name: 'Acme Inc.',
    });
    console.log(result);
  });
</script>
```

The UMD bundle exposes a `RazorpayUniversal` global with `RazorpayClient`, `openCheckout`, `loadRazorpayScript`, and the error classes.

---

## Full TypeScript example

```ts
import type { RazorpayCheckoutOptions } from 'razorpay-universal';

const options: RazorpayCheckoutOptions = {
  key: 'rzp_test_xxx',
  amount: 49900,
  currency: 'INR',
  order_id: 'order_LkjHg87',
  name: 'Acme Inc.',
  description: 'Monthly subscription',
  image: 'https://example.com/logo.png',
  prefill: {
    name: 'Jane Doe',
    email: 'jane@example.com',
    contact: '+919999999999',
  },
  notes: {
    plan: 'pro',
  },
  theme: {
    color: '#528FF0',
  },
  modal: {
    confirm_close: true,
    escape: false,
  },
  retry: { enabled: true, max_count: 3 },
};
```

---

## API reference

### Core (framework-agnostic)

| Export                 | Description                                                              |
| ---------------------- | ------------------------------------------------------------------------ |
| `loadRazorpayScript()` | Idempotent script loader. Returns `Promise<void>`.                       |
| `isScriptLoaded()`     | Sync boolean — whether `window.Razorpay` is available.                   |
| `createCheckout(opts)` | Returns a `RazorpayInstance`.                                            |
| `openCheckout(opts)`   | Promise-wrapped `new Razorpay(opts).open()`.                             |
| `RazorpayLoadError`    | Thrown when script loading fails / times out.                            |
| `RazorpayCheckoutError`| Thrown when checkout fails, is dismissed, or can't be instantiated.      |

### React — `useRazorpay(options?)`

| Field       | Type                                                  |
| ----------- | ----------------------------------------------------- |
| `open`      | `(opts) => Promise<RazorpaySuccessResponse>`          |
| `close`     | `() => void`                                          |
| `isLoading` | `boolean`                                             |
| `isReady`   | `boolean`                                             |
| `error`     | `Error \| null`                                       |

### Vue — `useRazorpay(options?)`

Same fields as React except `isLoading`, `isReady`, and `error` are `Ref`s.

### Angular — `RazorpayService`

| Method       | Signature                                                           |
| ------------ | ------------------------------------------------------------------- |
| `load`       | `(options?: LoadScriptOptions) => Promise<void>`                    |
| `open`       | `(opts, loadOpts?) => Promise<RazorpaySuccessResponse>`             |
| `close`      | `() => void`                                                        |
| `isReady`    | `() => boolean`                                                     |

Register once with `RazorpayModule.forRoot({ timeout?, scriptUrl? })`.

### Vanilla — `RazorpayClient`

| Member    | Description                                                             |
| --------- | ----------------------------------------------------------------------- |
| `load()`  | Load the script.                                                        |
| `open()`  | Promise-wrapped checkout open.                                          |
| `close()` | Force-close the modal.                                                  |
| `isReady` | `readonly boolean` — whether the script is loaded.                      |

---

## SSR notes

- **Next.js**: The React hook only triggers the script load inside `useEffect`, so it never runs on the server. Mark the component using it with `'use client'`.
- **Nuxt 3**: The Vue composable guards every `window` / `document` access with a `typeof window !== 'undefined'` check, so it is safe inside `<script setup>` even on the server.
- **Angular Universal**: The service uses `PLATFORM_ID` with `isPlatformBrowser` — `open()` rejects on the server and `load()` becomes a no-op.

---

## License

MIT
