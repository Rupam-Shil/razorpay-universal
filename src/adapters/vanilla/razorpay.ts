import {
  RazorpayCheckoutError,
  createCheckout,
  isScriptLoaded,
  loadRazorpayScript,
} from '../../core';
import type {
  LoadScriptOptions,
  RazorpayCheckoutOptions,
  RazorpayFailureResponse,
  RazorpayInstance,
  RazorpaySuccessResponse,
} from '../../core';

export class RazorpayClient {
  private readonly loadOptions: LoadScriptOptions;
  private instance: RazorpayInstance | null = null;

  constructor(loadOptions: LoadScriptOptions = {}) {
    this.loadOptions = loadOptions;
  }

  public get isReady(): boolean {
    return isScriptLoaded();
  }

  public load(): Promise<void> {
    return loadRazorpayScript(this.loadOptions);
  }

  public close(): void {
    if (this.instance) {
      try {
        this.instance.close();
      } catch {
        // no-op
      }
      this.instance = null;
    }
  }

  public open(
    checkoutOptions: RazorpayCheckoutOptions,
  ): Promise<RazorpaySuccessResponse> {
    return new Promise<RazorpaySuccessResponse>((resolve, reject) => {
      let settled = false;
      const settle = (fn: () => void): void => {
        if (settled) return;
        settled = true;
        fn();
      };

      const userHandler = checkoutOptions.handler;
      const userModal = checkoutOptions.modal;
      const userOnDismiss = userModal?.ondismiss;

      const wrappedOptions: RazorpayCheckoutOptions = {
        ...checkoutOptions,
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

      createCheckout(wrappedOptions, this.loadOptions)
        .then((instance) => {
          this.instance = instance;

          instance.on('payment.failed', (payload: unknown) => {
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
            instance.open();
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
  }
}
