import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

declare const __APP_VERSION__: string;

// En Android la verdad es el versionName que instaló el sistema, no lo que diga
// el bundle web: si alguien instala un APK viejo, la app tiene que saberlo.
export async function currentAppVersion(): Promise<string> {
  if (Capacitor.isNativePlatform()) {
    try {
      return (await App.getInfo()).version;
    } catch {
      return __APP_VERSION__;
    }
  }
  return __APP_VERSION__;
}

export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}
