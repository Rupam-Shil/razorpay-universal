import {
  Inject,
  Injectable,
  InjectionToken,
  Optional,
  PLATFORM_ID,
} from '@angular/core';
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

export const RAZORPAY_LOAD_OPTIONS = new InjectionToken<LoadScriptOptions>(
  'RAZORPAY_LOAD_OPTIONS',
);

function isPlatformBrowser(platformId: unknown): boolean {
  return platformId === 'browser';
}

@Injectable({ providedIn: 'root' })
export class RazorpayService {
  private instance: RazorpayInstance | null = null;
  private readonly defaultOptions: LoadScriptOptions;

  constructor(
    @Inject(PLATFORM_ID) private readonly platformId: object,
    @Optional()
    @Inject(RAZORPAY_LOAD_OPTIONS)
    defaultOptions: LoadScriptOptions | null,
  ) {
    this.defaultOptions = defaultOptions ?? {};
  }

  public load(options?: LoadScriptOptions): Promise<void> {
    if (!isPlatformBrowser(this.platformId)) {
      return Promise.resolve();
    }
    return loadRazorpayScript({ ...this.defaultOptions, ...options });
  }

  public isReady(): boolean {
    if (!isPlatformBrowser(this.platformId)) return false;
    return isScriptLoaded();
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
    loadOptions?: LoadScriptOptions,
  ): Promise<RazorpaySuccessResponse> {
    if (!isPlatformBrowser(this.platformId)) {
      return Promise.reject(
        new RazorpayCheckoutError(
          'Razorpay checkout cannot be opened on the server.',
        ),
      );
    }

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

      createCheckout(wrappedOptions, { ...this.defaultOptions, ...loadOptions })
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
