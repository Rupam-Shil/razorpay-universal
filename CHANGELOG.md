# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - Initial release

### Added
- Core script loader (`loadRazorpayScript`, `isScriptLoaded`) — idempotent, singleton, SSR-safe.
- Core checkout helpers (`createCheckout`, `openCheckout`) with Promise-based API.
- Error classes: `RazorpayLoadError`, `RazorpayCheckoutError`.
- React adapter: `useRazorpay` hook (Next.js-compatible, SSR-safe).
- Vue 3 adapter: `useRazorpay` composable (Nuxt 3-compatible).
- Angular adapter: `RazorpayService` + `RazorpayModule.forRoot()` (Angular Universal-safe).
- Vanilla JS adapter: `RazorpayClient` class with UMD + ESM + CJS builds.
- Full TypeScript types for all Razorpay checkout options, success and failure responses.
- Rollup multi-entry build generating ESM, CJS, UMD, and `.d.ts` files.
- Vitest unit tests covering the loader, checkout, React hook, and Vue composable.
