import { Injectable, signal } from '@angular/core';
import { SESSION_API_KEY } from '../constants';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly hasKey = signal(this.readKey().length > 0);

  readonly devKeyHint = environment.devInternalApiKeyHint;

  getApiKey(): string {
    return this.readKey();
  }

  setApiKey(key: string): void {
    const trimmed = key.trim();
    if (trimmed) {
      sessionStorage.setItem(SESSION_API_KEY, trimmed);
    } else {
      sessionStorage.removeItem(SESSION_API_KEY);
    }
    this.hasKey.set(trimmed.length > 0);
  }

  clear(): void {
    sessionStorage.removeItem(SESSION_API_KEY);
    this.hasKey.set(false);
  }

  private readKey(): string {
    return sessionStorage.getItem(SESSION_API_KEY) ?? '';
  }
}
