import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PlatformApiService } from '../api/platform-api.service';

export type RealtimeEventType =
  | 'stats_updated'
  | 'announcement_published'
  | 'feed_post_deleted'
  | 'flags_updated'
  | 'account_provisioned'
  | 'campus_notice_published'
  | 'campus_notice_updated'
  | 'campus_notice_ended';

export type RealtimeEvent = {
  type: RealtimeEventType;
  payload?: unknown;
  timestamp?: string;
};

type WsTicketResponse = {
  ticket: string;
  expiresAt?: string;
};

const RECONNECT_BASE_MS = 2_000;
const RECONNECT_MAX_MS = 30_000;

@Injectable({ providedIn: 'root' })
export class RealtimeService implements OnDestroy {
  private readonly api = inject(PlatformApiService);

  private socket: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempt = 0;
  private started = false;
  private disposed = false;

  readonly connected = signal(false);
  readonly lastToast = signal<string | null>(null);

  private readonly eventsSubject = new Subject<RealtimeEvent>();
  readonly events$ = this.eventsSubject.asObservable();

  connect(): void {
    if (this.started || this.disposed || typeof WebSocket === 'undefined') {
      return;
    }
    this.started = true;
    this.openSocket();
  }

  ngOnDestroy(): void {
    this.disposed = true;
    this.teardownSocket();
    this.eventsSubject.complete();
  }

  dismissToast(): void {
    this.lastToast.set(null);
  }

  private openSocket(): void {
    if (this.disposed) {
      return;
    }

    this.api.get<WsTicketResponse>('/ws-ticket').subscribe({
      next: ({ ticket }) => {
        if (this.disposed || !ticket) {
          return;
        }
        this.teardownSocket(false);

        const url = this.wsUrl(ticket);
        const socket = new WebSocket(url);
        this.socket = socket;

        socket.onopen = () => {
          this.reconnectAttempt = 0;
          this.connected.set(true);
        };

        socket.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        socket.onclose = () => {
          this.connected.set(false);
          this.socket = null;
          this.scheduleReconnect();
        };

        socket.onerror = () => {
          socket.close();
        };
      },
      error: () => {
        this.connected.set(false);
        this.scheduleReconnect();
      },
    });
  }

  private handleMessage(raw: unknown): void {
    if (typeof raw !== 'string') {
      return;
    }

    let parsed: RealtimeEvent;
    try {
      parsed = JSON.parse(raw) as RealtimeEvent;
    } catch {
      return;
    }

    if (!parsed?.type) {
      return;
    }

    this.eventsSubject.next(parsed);

    if (parsed.type === 'announcement_published') {
      const title =
        typeof parsed.payload === 'object' &&
        parsed.payload !== null &&
        'title' in parsed.payload &&
        typeof (parsed.payload as { title?: unknown }).title === 'string'
          ? (parsed.payload as { title: string }).title
          : null;
      this.lastToast.set(
        title ? `Novo aviso publicado: ${title}` : 'Novo aviso de desenvolvedor publicado.',
      );
    }
  }

  private wsUrl(ticket: string): string {
    const query = `ticket=${encodeURIComponent(ticket)}`;
    const path = `/ws/platform?${query}`;

    if (environment.platformApiUrl?.trim()) {
      const httpBase = environment.platformApiUrl.replace(/\/$/, '');
      const wsBase = httpBase.replace(/^http/, 'ws').replace(/\/platform\/v1$/, '');
      return `${wsBase}${path}`;
    }

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${window.location.host}${path}`;
  }

  private scheduleReconnect(): void {
    if (this.disposed || this.reconnectTimer) {
      return;
    }

    const delay = Math.min(RECONNECT_BASE_MS * 2 ** this.reconnectAttempt, RECONNECT_MAX_MS);
    this.reconnectAttempt += 1;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.openSocket();
    }, delay);
  }

  private teardownSocket(clearStarted = true): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      this.socket.onopen = null;
      this.socket.onmessage = null;
      this.socket.onclose = null;
      this.socket.onerror = null;
      this.socket.close();
      this.socket = null;
    }

    this.connected.set(false);

    if (clearStarted) {
      this.started = false;
    }
  }
}
