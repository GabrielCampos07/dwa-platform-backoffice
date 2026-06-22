import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';

type RequestOptions = {
  params?: HttpParams;
};

@Injectable({ providedIn: 'root' })
export class InternalApiService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);

  get<T>(path: string, options?: RequestOptions) {
    return this.http.get<T>(path, { headers: this.headers(), ...options });
  }

  post<T>(path: string, body: unknown) {
    return this.http.post<T>(path, body, { headers: this.headers() });
  }

  put<T>(path: string, body: unknown) {
    return this.http.put<T>(path, body, { headers: this.headers() });
  }

  patch<T>(path: string, body: unknown) {
    return this.http.patch<T>(path, body, { headers: this.headers() });
  }

  private headers(): HttpHeaders {
    const key = this.auth.getApiKey();
    return new HttpHeaders({
      Authorization: `Bearer ${key}`,
      'X-Internal-Api-Key': key,
    });
  }
}
