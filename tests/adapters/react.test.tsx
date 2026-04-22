import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useRazorpay } from '../../src/adapters/react/useRazorpay';
import { resetLoaderState } from '../../src/core/loader';
import type {
  RazorpayCheckoutOptions,
  RazorpayEventHandler,
  RazorpayInstance,
  RazorpaySuccessResponse,
} from '../../src/core/types';

interface MockInstance extends RazorpayInstance {
  options: RazorpayCheckoutOptions;
  listeners: Record<string, RazorpayEventHandler[]>;
  openCalls: number;
  closeCalls: number;
}

function installMockRazorpay(): { lastInstance: () => MockInstance | null } {
  let instance: MockInstance | null = null;
  function Mock(this: MockInstance, options: RazorpayCheckoutOptions): void {
    this.options = options;
    this.listeners = {};
    this.openCalls = 0;
    this.closeCalls = 0;
    this.open = () => {
      this.openCalls += 1;
    };
    this.close = () => {
      this.closeCalls += 1;
    };
    this.on = (event: string, handler: RazorpayEventHandler) => {
      const list = this.listeners[event] ?? [];
      list.push(handler);
      this.listeners[event] = list;
    };
    instance = this;
  }
  vi.stubGlobal('Razorpay', Mock);
  return { lastInstance: () => instance };
}

describe('useRazorpay (React)', () => {
  beforeEach(() => {
    resetLoaderState();
    vi.unstubAllGlobals();
    delete (window as { Razorpay?: unknown }).Razorpay;
  });

  afterEach(() => {
    resetLoaderState();
    vi.unstubAllGlobals();
    delete (window as { Razorpay?: unknown }).Razorpay;
  });

  it('starts loading and becomes ready once script is available', async () => {
    installMockRazorpay();
    const { result } = renderHook(() => useRazorpay());

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('open() constructs Razorpay with the given options and calls open()', async () => {
    const { lastInstance } = installMockRazorpay();
    const { result } = renderHook(() => useRazorpay());

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    const opts: RazorpayCheckoutOptions = {
      key: 'rzp_test_abc',
      amount: 9999,
      currency: 'INR',
    };

    let openPromise: Promise<RazorpaySuccessResponse> | null = null;
    await act(async () => {
      openPromise = result.current.open(opts);
      await Promise.resolve();
    });

    const inst = lastInstance();
    expect(inst).not.toBeNull();
    expect(inst!.options.key).toBe('rzp_test_abc');
    expect(inst!.options.amount).toBe(9999);
    expect(inst!.openCalls).toBe(1);

    await act(async () => {
      const response: RazorpaySuccessResponse = {
        razorpay_payment_id: 'pay',
        razorpay_order_id: 'order',
        razorpay_signature: 'sig',
      };
      inst!.options.handler?.(response);
    });

    await expect(openPromise!).resolves.toMatchObject({
      razorpay_payment_id: 'pay',
    });
  });

  it('rejects open() when payment.failed fires', async () => {
    const { lastInstance } = installMockRazorpay();
    const { result } = renderHook(() => useRazorpay());

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    let openPromise: Promise<RazorpaySuccessResponse> | null = null;
    await act(async () => {
      openPromise = result.current.open({ key: 'rzp_test' });
      // silence unhandled-rejection warnings until `.rejects` attaches
      openPromise.catch(() => undefined);
      await Promise.resolve();
    });

    const inst = lastInstance();
    await act(async () => {
      inst!.listeners['payment.failed']?.[0]?.({
        error: {
          code: 'E',
          description: 'boom',
          source: 's',
          step: 'p',
          reason: 'r',
          metadata: {},
        },
      });
    });

    await expect(openPromise!).rejects.toMatchObject({
      name: 'RazorpayCheckoutError',
      message: 'boom',
    });
  });

  it('closes the modal on unmount', async () => {
    const { lastInstance } = installMockRazorpay();
    const { result, unmount } = renderHook(() => useRazorpay());

    await waitFor(() => {
      expect(result.current.isReady).toBe(true);
    });

    await act(async () => {
      void result.current.open({ key: 'rzp_test' }).catch(() => {
        // expected — promise will be abandoned by unmount
      });
      await Promise.resolve();
    });

    const inst = lastInstance();
    expect(inst).not.toBeNull();

    unmount();
    expect(inst!.closeCalls).toBeGreaterThan(0);
  });
});
