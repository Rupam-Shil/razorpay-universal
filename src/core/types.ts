export interface RazorpayPrefill {
  name?: string;
  email?: string;
  contact?: string;
  method?: 'card' | 'netbanking' | 'wallet' | 'emi' | 'upi';
}

export interface RazorpayTheme {
  hide_topbar?: boolean;
  color?: string;
  backdrop_color?: string;
}

export interface RazorpayModalOptions {
  backdropclose?: boolean;
  escape?: boolean;
  handleback?: boolean;
  confirm_close?: boolean;
  ondismiss?: () => void;
  animation?: boolean;
}

export interface RazorpayRetryOptions {
  enabled?: boolean;
  max_count?: number;
}

export interface RazorpaySubscriptionCardChange {
  enabled?: boolean;
}

export interface RazorpayReadonly {
  contact?: boolean;
  email?: boolean;
  name?: boolean;
}

export interface RazorpayHidden {
  contact?: boolean;
  email?: boolean;
}

export interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
  [key: string]: unknown;
}

export interface RazorpayErrorPayload {
  code: string;
  description: string;
  source: string;
  step: string;
  reason: string;
  metadata: {
    order_id?: string;
    payment_id?: string;
    [key: string]: unknown;
  };
}

export interface RazorpayFailureResponse {
  error: RazorpayErrorPayload;
}

export interface RazorpayCheckoutOptions {
  key: string;
  amount?: number | string;
  currency?: string;
  name?: string;
  description?: string;
  image?: string;
  order_id?: string;
  customer_id?: string;
  recurring?: boolean;
  callback_url?: string;
  redirect?: boolean;
  subscription_id?: string;
  subscription_card_change?: boolean | RazorpaySubscriptionCardChange;
  prefill?: RazorpayPrefill;
  notes?: Record<string, string | number | boolean>;
  theme?: RazorpayTheme;
  modal?: RazorpayModalOptions;
  readonly?: RazorpayReadonly;
  hidden?: RazorpayHidden;
  send_sms_hash?: boolean;
  allow_rotation?: boolean;
  retry?: RazorpayRetryOptions;
  timeout?: number;
  remember_customer?: boolean;
  config?: Record<string, unknown>;
  handler?: (response: RazorpaySuccessResponse) => void;
  [key: string]: unknown;
}

export type RazorpayEventName =
  | 'payment.submit'
  | 'payment.authorized'
  | 'payment.failed'
  | 'payment.success'
  | 'payment.error'
  | (string & {});

export type RazorpayEventHandler = (payload: unknown) => void;

export interface RazorpayInstance {
  open: () => void;
  close: () => void;
  on: (event: RazorpayEventName, handler: RazorpayEventHandler) => void;
}

export type RazorpayConstructor = new (
  options: RazorpayCheckoutOptions,
) => RazorpayInstance;

export interface LoadScriptOptions {
  timeout?: number;
  scriptUrl?: string;
}

export interface UseRazorpayReturn {
  open: (
    options: RazorpayCheckoutOptions,
  ) => Promise<RazorpaySuccessResponse>;
  close: () => void;
  isLoading: boolean;
  isReady: boolean;
  error: Error | null;
}

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}
