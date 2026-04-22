import { NgModule, type ModuleWithProviders } from '@angular/core';
import {
  RAZORPAY_LOAD_OPTIONS,
  RazorpayService,
} from './razorpay.service';
import type { LoadScriptOptions } from '../../core';

@NgModule({
  providers: [RazorpayService],
})
export class RazorpayModule {
  public static forRoot(
    options: LoadScriptOptions = {},
  ): ModuleWithProviders<RazorpayModule> {
    return {
      ngModule: RazorpayModule,
      providers: [
        RazorpayService,
        { provide: RAZORPAY_LOAD_OPTIONS, useValue: options },
      ],
    };
  }
}
