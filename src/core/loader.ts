import type { LoadScriptOptions } from './types';

export const DEFAULT_RAZORPAY_SCRIPT_URL =
  'https://checkout.razorpay.com/v1/checkout.js';
export const DEFAULT_LOAD_TIMEOUT_MS = 10_000;

export class RazorpayLoadError extends Error {
  public readonly cause?: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'RazorpayLoadError';
    this.cause = cause;
  }
}

interface LoaderState {
  promise: Promise<void> | null;
  scriptUrl: string | null;
}

const state: LoaderState = {
  promise: null,
  scriptUrl: null,
};

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

export function isScriptLoaded(): boolean {
  if (!isBrowser()) return false;
  return typeof window.Razorpay === 'function';
}

export function resetLoaderState(): void {
  state.promise = null;
  state.scriptUrl = null;
}

function validateScriptUrl(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new RazorpayLoadError(
      `Invalid scriptUrl: "${url}" is not a valid URL.`,
    );
  }
  if (parsed.protocol !== 'https:') {
    throw new RazorpayLoadError(
      `Invalid scriptUrl: only https:// URLs are allowed (got "${parsed.protocol}").`,
    );
  }
}

export function loadRazorpayScript(
  options: LoadScriptOptions = {},
): Promise<void> {
  const scriptUrl = options.scriptUrl ?? DEFAULT_RAZORPAY_SCRIPT_URL;
  const timeout = options.timeout ?? DEFAULT_LOAD_TIMEOUT_MS;

  if (!isBrowser()) {
    return Promise.reject(
      new RazorpayLoadError(
        'Razorpay script cannot be loaded in a non-browser environment.',
      ),
    );
  }

  try {
    validateScriptUrl(scriptUrl);
  } catch (err) {
    return Promise.reject(err);
  }

  if (isScriptLoaded()) {
    return Promise.resolve();
  }

  if (state.promise && state.scriptUrl === scriptUrl) {
    return state.promise;
  }

  state.scriptUrl = scriptUrl;
  state.promise = new Promise<void>((resolve, reject) => {
    // CSS.escape prevents selector injection when scriptUrl contains quotes
    // or other special CSS characters.
    const escapedUrl =
      typeof CSS !== 'undefined' && CSS.escape
        ? CSS.escape(scriptUrl)
        : scriptUrl.replace(/["\\]/g, '\\$&');
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${escapedUrl}"]`,
    );

    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const cleanup = (): void => {
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    const handleLoad = (): void => {
      cleanup();
      if (isScriptLoaded()) {
        resolve();
      } else {
        state.promise = null;
        reject(
          new RazorpayLoadError(
            'Razorpay script loaded but window.Razorpay is undefined.',
          ),
        );
      }
    };

    const handleError = (err: unknown): void => {
      cleanup();
      state.promise = null;
      reject(
        new RazorpayLoadError(
          `Failed to load Razorpay script from ${scriptUrl}`,
          err,
        ),
      );
    };

    timeoutId = setTimeout(() => {
      state.promise = null;
      reject(
        new RazorpayLoadError(
          `Timed out after ${timeout}ms loading Razorpay script from ${scriptUrl}`,
        ),
      );
    }, timeout);

    if (existing) {
      existing.addEventListener('load', handleLoad, { once: true });
      existing.addEventListener('error', handleError, { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = scriptUrl;
    script.async = true;
    script.defer = true;
    script.dataset.razorpayUniversal = 'true';
    script.addEventListener('load', handleLoad, { once: true });
    script.addEventListener('error', handleError, { once: true });
    document.head.appendChild(script);
  });

  return state.promise;
}
