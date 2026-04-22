import { loadRazorpayScript } from './loader';
import type {
  LoadScriptOptions,
  RazorpayCheckoutOptions,
  RazorpayFailureResponse,
  RazorpayInstance,
  RazorpaySuccessResponse,
} from './types';

export class RazorpayCheckoutError extends Error {
  public readonly payload?: RazorpayFailureResponse['error'];
  public readonly cause?: unknown;

  constructor(
    message: string,
    payload?: RazorpayFailureResponse['error'],
    cause?: unknown,
  ) {
    super(message);
    this.name = 'RazorpayCheckoutError';
    this.payload = payload;
    this.cause = cause;
  }
}

function assertRazorpayAvailable(): NonNullable<typeof window.Razorpay> {
  if (typeof window === 'undefined' || typeof window.Razorpay !== 'function') {
    throw new RazorpayCheckoutError(
      'Razorpay SDK is not available on window. Did you call loadRazorpayScript() first?',
    );
  }
  return window.Razorpay;
}

export async function createCheckout(
  options: RazorpayCheckoutOptions,
  loadOptions: LoadScriptOptions = {},
): Promise<RazorpayInstance> {
  await loadRazorpayScript(loadOptions);
  const Razorpay = assertRazorpayAvailable();
  return new Razorpay(options);
}

export async function openCheckout(
  options: RazorpayCheckoutOptions,
  loadOptions: LoadScriptOptions = {},
): Promise<RazorpaySuccessResponse> {
  await loadRazorpayScript(loadOptions);
  const Razorpay = assertRazorpayAvailable();

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
          // user handler errors must not propagate into Razorpay runtime
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

    let instance: RazorpayInstance;
    try {
      instance = new Razorpay(wrappedOptions);
    } catch (err) {
      reject(
        new RazorpayCheckoutError(
          'Failed to instantiate Razorpay checkout.',
          undefined,
          err,
        ),
      );
      return;
    }

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
  });
}
