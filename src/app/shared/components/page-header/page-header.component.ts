import { Component, input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  template: `
    <header class="page-header">
      <div class="page-header__row">
        <div>
          <h1>{{ title() }}</h1>
          @if (description()) {
            <p>{{ description() }}</p>
          }
        </div>
        <ng-content select="[actions]" />
      </div>
    </header>
  `,
  styles: `
    .page-header__row {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .page-header h1 {
      margin: 0 0 0.25rem;
      font-family: var(--dwa-font-display);
    }

    .page-header p {
      margin: 0;
      color: var(--dwa-text-muted);
      font-size: 0.875rem;
    }

    .page-header p :global(code) {
      font-size: 0.8125rem;
    }
  `,
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly description = input('');
}
