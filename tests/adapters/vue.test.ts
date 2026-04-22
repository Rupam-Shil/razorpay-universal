import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { defineComponent, h, nextTick } from 'vue';
import {
  useRazorpay,
  type UseRazorpayResult,
} from '../../src/adapters/vue/useRazorpay';
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

function mountWithHook(): {
  api: UseRazorpayResult;
  unmount: () => void;
} {
  let api!: UseRazorpayResult;
  const component = defineComponent({
    setup() {
      api = useRazorpay();
      return () => h('div');
    },
  });
  const wrapper = mount(component);
  return { api, unmount: () => wrapper.unmount() };
}

describe('useRazorpay (Vue)', () => {
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

  it('becomes ready after script loads', async () => {
    installMockRazorpay();
    const { api } = mountWithHook();

    expect(api.isLoading.value).toBe(true);
    // allow the microtask to flush
    await Promise.resolve();
    await nextTick();
    await Promise.resolve();

    expect(api.isReady.value).toBe(true);
    expect(api.isLoading.value).toBe(false);
    expect(api.error.value).toBeNull();
  });

  it('open() passes checkout options to Razorpay constructor', async () => {
    const { lastInstance } = installMockRazorpay();
    const { api } = mountWithHook();

    await Promise.resolve();
    await nextTick();
    await Promise.resolve();

    const openPromise = api.open({
      key: 'rzp_vue',
      amount: 500,
    });
    await nextTick();
    await Promise.resolve();

    const inst = lastInstance();
    expect(inst).not.toBeNull();
    expect(inst!.options.key).toBe('rzp_vue');
    expect(inst!.options.amount).toBe(500);
    expect(inst!.openCalls).toBe(1);

    const response: RazorpaySuccessResponse = {
      razorpay_payment_id: 'p',
      razorpay_order_id: 'o',
      razorpay_signature: 's',
    };
    inst!.options.handler?.(response);

    await expect(openPromise).resolves.toMatchObject({
      razorpay_payment_id: 'p',
    });
  });

  it('closes modal on unmount', async () => {
    const { lastInstance } = installMockRazorpay();
    const { api, unmount } = mountWithHook();

    await Promise.resolve();
    await nextTick();
    await Promise.resolve();

    void api.open({ key: 'rzp_vue' }).catch(() => {
      // swallow
    });
    await nextTick();
    await Promise.resolve();

    const inst = lastInstance();
    expect(inst).not.toBeNull();

    unmount();
    expect(inst!.closeCalls).toBeGreaterThan(0);
  });
});
