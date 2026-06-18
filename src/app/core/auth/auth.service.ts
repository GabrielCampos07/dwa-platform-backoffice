import { Injectable, signal } from '@angular/core';
import { SESSION_API_KEY, SESSION_OPERATOR_ID } from '../constants';
import { environment } from '../../../environments/environment';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidOperatorId(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) {
    return true;
  }
  if (trimmed.length >= 3 && !trimmed.includes('@')) {
    return true;
  }
  return EMAIL_PATTERN.test(trimmed);
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly hasKey = signal(this.readKey().length > 0);
  readonly operatorId = signal(this.readOperatorId());

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

  getOperatorId(): string {
    return this.readOperatorId();
  }

  setOperatorId(operatorId: string): void {
    const trimmed = operatorId.trim();
    if (trimmed) {
      sessionStorage.setItem(SESSION_OPERATOR_ID, trimmed);
    } else {
      sessionStorage.removeItem(SESSION_OPERATOR_ID);
    }
    this.operatorId.set(trimmed);
  }

  clear(): void {
    sessionStorage.removeItem(SESSION_API_KEY);
    sessionStorage.removeItem(SESSION_OPERATOR_ID);
    this.hasKey.set(false);
    this.operatorId.set('');
  }

  private readKey(): string {
    return sessionStorage.getItem(SESSION_API_KEY) ?? '';
  }

  private readOperatorId(): string {
    return sessionStorage.getItem(SESSION_OPERATOR_ID) ?? '';
  }
}
