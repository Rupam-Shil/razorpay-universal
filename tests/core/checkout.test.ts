import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { openCheckout } from '../../src/core/checkout';
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

function createMockConstructor(): {
  ctor: new (options: RazorpayCheckoutOptions) => RazorpayInstance;
  lastInstance: () => MockInstance | null;
} {
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

  return {
    ctor: Mock as unknown as new (
      options: RazorpayCheckoutOptions,
    ) => RazorpayInstance,
    lastInstance: () => instance,
  };
}

describe('openCheckout', () => {
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

  it('resolves with the success response when the handler fires', async () => {
    const { ctor, lastInstance } = createMockConstructor();
    vi.stubGlobal('Razorpay', ctor);

    const success: RazorpaySuccessResponse = {
      razorpay_payment_id: 'pay_123',
      razorpay_order_id: 'order_123',
      razorpay_signature: 'sig_123',
    };

    const promise = openCheckout({
      key: 'rzp_test_key',
      amount: 1000,
    });

    await new Promise((r) => setTimeout(r, 0));
    const inst = lastInstance();
    expect(inst).not.toBeNull();
    expect(inst!.openCalls).toBe(1);
    inst!.options.handler?.(success);

    await expect(promise).resolves.toEqual(success);
  });

  it('rejects with RazorpayCheckoutError when payment.failed fires', async () => {
    const { ctor, lastInstance } = createMockConstructor();
    vi.stubGlobal('Razorpay', ctor);

    const promise = openCheckout({
      key: 'rzp_test_key',
      amount: 1000,
    });

    await new Promise((r) => setTimeout(r, 0));
    const inst = lastInstance();
    expect(inst).not.toBeNull();

    const failure = {
      error: {
        code: 'BAD_REQUEST',
        description: 'card declined',
        source: 'customer',
        step: 'payment',
        reason: 'bank_declined',
        metadata: { payment_id: 'pay_f' },
      },
    };
    inst!.listeners['payment.failed']?.[0]?.(failure);

    await expect(promise).rejects.toMatchObject({
      name: 'RazorpayCheckoutError',
      message: 'card declined',
    });
  });

  it('rejects when the modal is dismissed', async () => {
    const { ctor, lastInstance } = createMockConstructor();
    vi.stubGlobal('Razorpay', ctor);

    const promise = openCheckout({
      key: 'rzp_test_key',
      amount: 1000,
    });

    await new Promise((r) => setTimeout(r, 0));
    const inst = lastInstance();
    inst!.options.modal?.ondismiss?.();

    await expect(promise).rejects.toMatchObject({
      name: 'RazorpayCheckoutError',
    });
  });

  it("still calls the user's own handler after resolving", async () => {
    const { ctor, lastInstance } = createMockConstructor();
    vi.stubGlobal('Razorpay', ctor);

    const userHandler = vi.fn();
    const promise = openCheckout({
      key: 'rzp_test_key',
      handler: userHandler,
    });

    await new Promise((r) => setTimeout(r, 0));
    const success: RazorpaySuccessResponse = {
      razorpay_payment_id: 'p',
      razorpay_order_id: 'o',
      razorpay_signature: 's',
    };
    lastInstance()!.options.handler?.(success);

    await expect(promise).resolves.toEqual(success);
    expect(userHandler).toHaveBeenCalledWith(success);
  });
});
