import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

export type HealthResponse = {
  status: string;
  version: string;
  timestamp: string;
};

@Injectable({ providedIn: 'root' })
export class HealthApiService {
  private readonly http = inject(HttpClient);

  check() {
    return this.http.get<HealthResponse>('/health');
  }
}
