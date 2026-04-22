import { useCallback, useEffect, useRef, useState } from 'react';
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
  isLoading: boolean;
  isReady: boolean;
  error: Error | null;
}

export function useRazorpay(
  loadOptions: LoadScriptOptions = {},
): UseRazorpayResult {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isReady, setIsReady] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const instanceRef = useRef<RazorpayInstance | null>(null);
  const mountedRef = useRef<boolean>(true);

  const timeout = loadOptions.timeout;
  const scriptUrl = loadOptions.scriptUrl;

  useEffect(() => {
    mountedRef.current = true;
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return () => {
        mountedRef.current = false;
      };
    }

    setIsLoading(true);
    setError(null);

    loadRazorpayScript({ timeout, scriptUrl })
      .then(() => {
        if (!mountedRef.current) return;
        setIsReady(true);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (!mountedRef.current) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setIsReady(false);
        setIsLoading(false);
      });

    return () => {
      mountedRef.current = false;
      if (instanceRef.current) {
        try {
          instanceRef.current.close();
        } catch {
          // no-op
        }
        instanceRef.current = null;
      }
    };
  }, [timeout, scriptUrl]);

  const close = useCallback(() => {
    if (instanceRef.current) {
      try {
        instanceRef.current.close();
      } catch {
        // no-op
      }
      instanceRef.current = null;
    }
  }, []);

  const open = useCallback(
    (
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

        createCheckout(wrappedOptions, { timeout, scriptUrl })
          .then((instance) => {
            if (!mountedRef.current) {
              try {
                instance.close();
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

            instanceRef.current = instance;

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
    },
    [timeout, scriptUrl],
  );

  return { open, close, isLoading, isReady, error };
}
