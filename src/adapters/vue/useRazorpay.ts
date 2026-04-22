import { onBeforeUnmount, ref, type Ref } from 'vue';
import {
  RazorpayCheckoutError,
  createCheckout,
  loadRazorpayScript,
} from '../../core';
import type {
  LoadScriptOptions,
  RazorpayCheckoutOptions,
  RazorpayFailureResponse,
  RazorpayInstance,
  RazorpaySuccessResponse,
} from '../../core';

export interface UseRazorpayResult {
  open: (
    options: RazorpayCheckoutOptions,
  ) => Promise<RazorpaySuccessResponse>;
  close: () => void;
  isLoading: Ref<boolean>;
  isReady: Ref<boolean>;
  error: Ref<Error | null>;
}

export function useRazorpay(
  loadOptions: LoadScriptOptions = {},
): UseRazorpayResult {
  const isLoading = ref<boolean>(true);
  const isReady = ref<boolean>(false);
  const error = ref<Error | null>(null);
  let instance: RazorpayInstance | null = null;
  let mounted = true;

  if (typeof window === 'undefined') {
    isLoading.value = false;
  } else {
    loadRazorpayScript(loadOptions)
      .then(() => {
        if (!mounted) return;
        isReady.value = true;
        isLoading.value = false;
      })
      .catch((err: unknown) => {
        if (!mounted) return;
        error.value = err instanceof Error ? err : new Error(String(err));
        isReady.value = false;
        isLoading.value = false;
      });
  }

  const close = (): void => {
    if (instance) {
      try {
        instance.close();
      } catch {
        // no-op
      }
      instance = null;
    }
  };

  onBeforeUnmount(() => {
    mounted = false;
    close();
  });

  const open = (
    options: RazorpayCheckoutOptions,
  ): Promise<RazorpaySuccessResponse> => {
    return new Promise<RazorpaySuccessResponse>((resolve, reject) => {
      let settled = false;
      const settle = (fn: () => void): void => {
        if (settled) return;
        settled = true;
        fn();
      };

      const userHandler = options.handler;
      const userModal = options.modal;
      const userOnDismiss = userModal?.ondismiss;

      const wrappedOptions: RazorpayCheckoutOptions = {
        ...options,
        handler: (response: RazorpaySuccessResponse) => {
          settle(() => resolve(response));
          try {
            userHandler?.(response);
          } catch {
            // swallow
          }
        },
        modal: {
          ...userModal,
          ondismiss: () => {
            settle(() =>
              reject(
                new RazorpayCheckoutError(
                  'Razorpay checkout modal was dismissed by the user.',
                ),
              ),
            );
            try {
              userOnDismiss?.();
            } catch {
              // swallow
            }
          },
        },
      };

      createCheckout(wrappedOptions, loadOptions)
        .then((created) => {
          if (!mounted) {
            try {
              created.close();
            } catch {
              // no-op
            }
            settle(() =>
              reject(
                new RazorpayCheckoutError(
                  'Component unmounted before checkout could open.',
                ),
              ),
            );
            return;
          }

          instance = created;

          created.on('payment.failed', (payload: unknown) => {
            const failure = payload as RazorpayFailureResponse | undefined;
            settle(() =>
              reject(
                new RazorpayCheckoutError(
                  failure?.error?.description ?? 'Razorpay payment failed.',
                  failure?.error,
                ),
              ),
            );
          });

          try {
            created.open();
          } catch (err) {
            settle(() =>
              reject(
                new RazorpayCheckoutError(
                  'Failed to open Razorpay checkout.',
                  undefined,
                  err,
                ),
              ),
            );
          }
        })
        .catch((err: unknown) => {
          settle(() =>
            reject(err instanceof Error ? err : new Error(String(err))),
          );
        });
    });
  };

  return { open, close, isLoading, isReady, error };
}
