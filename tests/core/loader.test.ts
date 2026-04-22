import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_RAZORPAY_SCRIPT_URL,
  isScriptLoaded,
  loadRazorpayScript,
  resetLoaderState,
} from '../../src/core/loader';

function removeAllRazorpayScripts(): void {
  document
    .querySelectorAll<HTMLScriptElement>('script[src*="checkout.razorpay.com"]')
    .forEach((el) => el.remove());
  document
    .querySelectorAll<HTMLScriptElement>('script[data-razorpay-universal]')
    .forEach((el) => el.remove());
}

describe('loadRazorpayScript', () => {
  beforeEach(() => {
    resetLoaderState();
    removeAllRazorpayScripts();
    vi.unstubAllGlobals();
    delete (window as { Razorpay?: unknown }).Razorpay;
  });

  afterEach(() => {
    resetLoaderState();
    removeAllRazorpayScripts();
    vi.unstubAllGlobals();
    delete (window as { Razorpay?: unknown }).Razorpay;
  });

  it('resolves immediately when window.Razorpay already exists', async () => {
    vi.stubGlobal('Razorpay', function MockRazorpay() {
      /* no-op */
    });

    await expect(loadRazorpayScript()).resolves.toBeUndefined();
    const tags = document.querySelectorAll(
      `script[src="${DEFAULT_RAZORPAY_SCRIPT_URL}"]`,
    );
    expect(tags.length).toBe(0);
    expect(isScriptLoaded()).toBe(true);
  });

  it('injects the script tag only once on concurrent calls (singleton)', async () => {
    const p1 = loadRazorpayScript();
    const p2 = loadRazorpayScript();
    const p3 = loadRazorpayScript();

    const tagsImmediate = document.querySelectorAll(
      `script[src="${DEFAULT_RAZORPAY_SCRIPT_URL}"]`,
    );
    expect(tagsImmediate.length).toBe(1);

    const script = tagsImmediate[0] as HTMLScriptElement;
    // simulate successful load
    (window as { Razorpay?: unknown }).Razorpay = function MockRazorpay() {
      /* no-op */
    };
    script.dispatchEvent(new Event('load'));

    await Promise.all([p1, p2, p3]);

    const tagsAfter = document.querySelectorAll(
      `script[src="${DEFAULT_RAZORPAY_SCRIPT_URL}"]`,
    );
    expect(tagsAfter.length).toBe(1);
  });

  it('injects the script tag only once across sequential successful calls', async () => {
    const first = loadRazorpayScript();
    const script = document.querySelector<HTMLScriptElement>(
      `script[src="${DEFAULT_RAZORPAY_SCRIPT_URL}"]`,
    );
    expect(script).not.toBeNull();
    (window as { Razorpay?: unknown }).Razorpay = function MockRazorpay() {
      /* no-op */
    };
    script!.dispatchEvent(new Event('load'));
    await first;

    await loadRazorpayScript();
    const tags = document.querySelectorAll(
      `script[src="${DEFAULT_RAZORPAY_SCRIPT_URL}"]`,
    );
    expect(tags.length).toBe(1);
  });

  it('rejects with RazorpayLoadError after timeout', async () => {
    vi.useFakeTimers();
    const promise = loadRazorpayScript({ timeout: 50 });
    vi.advanceTimersByTime(100);
    await expect(promise).rejects.toMatchObject({
      name: 'RazorpayLoadError',
    });
    vi.useRealTimers();
  });

  it('rejects with RazorpayLoadError when script errors', async () => {
    const promise = loadRazorpayScript();
    const script = document.querySelector<HTMLScriptElement>(
      `script[src="${DEFAULT_RAZORPAY_SCRIPT_URL}"]`,
    );
    expect(script).not.toBeNull();
    script!.dispatchEvent(new Event('error'));
    await expect(promise).rejects.toMatchObject({
      name: 'RazorpayLoadError',
    });
  });

  it('isScriptLoaded reflects presence of window.Razorpay', () => {
    expect(isScriptLoaded()).toBe(false);
    vi.stubGlobal('Razorpay', function MockRazorpay() {
      /* no-op */
    });
    expect(isScriptLoaded()).toBe(true);
  });
});

describe('loadRazorpayScript SSR safety', () => {
  it('rejects in non-browser-like environment without touching DOM', async () => {
    const originalWindow = globalThis.window;
    const originalDocument = globalThis.document;
    // @ts-expect-error — simulate SSR
    delete globalThis.window;
    // @ts-expect-error — simulate SSR
    delete globalThis.document;

    try {
      await expect(loadRazorpayScript()).rejects.toMatchObject({
        name: 'RazorpayLoadError',
      });
    } finally {
      globalThis.window = originalWindow;
      globalThis.document = originalDocument;
    }
  });
});
