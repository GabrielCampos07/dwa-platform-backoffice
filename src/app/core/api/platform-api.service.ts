import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AuthService } from '../auth/auth.service';

type RequestOptions = {
  params?: HttpParams;
};

@Injectable({ providedIn: 'root' })
export class PlatformApiService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly base = (environment.platformApiUrl || '/platform/v1').replace(/\/$/, '');

  get<T>(path: string, options?: RequestOptions) {
    return this.http.get<T>(this.url(path), { headers: this.headers(), ...options });
  }

  post<T>(path: string, body: unknown) {
    return this.http.post<T>(this.url(path), body, { headers: this.headers() });
  }

  put<T>(path: string, body: unknown) {
    return this.http.put<T>(this.url(path), body, { headers: this.headers() });
  }

  patch<T>(path: string, body: unknown) {
    return this.http.patch<T>(this.url(path), body, { headers: this.headers() });
  }

  delete<T>(path: string, body?: unknown) {
    return this.http.delete<T>(this.url(path), { headers: this.headers(), body });
  }

  private url(path: string): string {
    const segment = path.startsWith('/') ? path : `/${path}`;
    return `${this.base}${segment}`;
  }

  private headers(): HttpHeaders {
    const key = this.auth.getApiKey();
    let headers = new HttpHeaders({
      Authorization: `Bearer ${key}`,
      'X-Internal-Api-Key': key,
    });

    const operatorId = this.auth.getOperatorId().trim();
    if (operatorId) {
      headers = headers.set('X-Platform-Operator-Id', operatorId);
    }

    return headers;
  }
}
