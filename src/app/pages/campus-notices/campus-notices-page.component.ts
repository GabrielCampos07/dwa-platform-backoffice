import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-campus-notices-page',
  imports: [RouterLink],
  template: `
    <header class="page-header">
      <div class="page-header__row">
        <div>
          <h1>Campus notices</h1>
          <p>Home promos and campus-wide banners for students.</p>
        </div>
        <button type="button" class="platform-btn-add" disabled aria-label="Novo aviso (indisponível)">
          <span class="material-symbols-outlined" aria-hidden="true">add</span>
        </button>
      </div>
    </header>

    <div class="gap-banner">
      <h2>API gap — not available via internal key yet</h2>
      <p>
        Campus notice CRUD lives on <strong>gym admin JWT routes</strong>, not on
        <code>/internal/v1</code>:
      </p>
      <ul>
        <li><code>GET/POST /api/v1/admin/notices</code></li>
        <li><code>PATCH /api/v1/admin/notices/:id</code></li>
        <li><code>POST …/publish</code>, <code>…/end</code>, <code>…/cancel</code></li>
      </ul>
      <p>
        Those routes require <code>Authorization: Bearer &lt;user-jwt&gt;</code>,
        <code>ADMIN</code> role, and the <code>banners</code> feature flag — the same surface used by
        <code>apps/web</code> gym admin UI.
      </p>
      <p><strong>Recommended next step:</strong> add internal platform routes (mirroring feature flags)
        or a dedicated platform service account — tracked in academia plan 10.</p>
      <p class="muted">
        For now, manage notices in the main SPA as gym admin, or enable
        <code>banners</code> via
        <a routerLink="/feature-flags">Feature flags</a>.
      </p>
    </div>
  `,
  styles: `
    .page-header h1 {
      margin: 0 0 0.25rem;
      font-family: var(--dwa-font-display);
    }

    .page-header__row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .page-header p {
      margin: 0;
      color: var(--dwa-text-muted);
    }

    .gap-banner {
      padding: 1.5rem;
      background: var(--dwa-bg-elevated);
      border: 1px solid rgba(255, 200, 87, 0.25);
      border-radius: var(--dwa-radius-lg);
    }

    .gap-banner h2 {
      margin: 0 0 0.75rem;
      font-size: 1rem;
      color: var(--dwa-warning);
    }

    .gap-banner p,
    .gap-banner li {
      font-size: 0.875rem;
      line-height: 1.5;
      color: var(--dwa-text-primary);
    }

    code {
      font-size: 0.8125rem;
    }

    .muted {
      color: var(--dwa-text-muted);
    }

    a {
      color: var(--dwa-gold-highlight);
    }
  `,
})
export class CampusNoticesPageComponent {}
