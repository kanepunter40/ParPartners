import { ApplicationConfig, ErrorHandler, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withComponentInputBinding, withPreloading, PreloadAllModules } from '@angular/router';
import { provideIonicAngular } from '@ionic/angular/standalone';
import { routes } from './app.routes';
import { ReportingErrorHandler } from './core/error-reporter';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(), // sends window errors and unhandled rejections to the ErrorHandler
    { provide: ErrorHandler, useClass: ReportingErrorHandler },
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideIonicAngular({ mode: 'ios' }),
    provideRouter(routes, withComponentInputBinding(), withPreloading(PreloadAllModules))
  ]
};
