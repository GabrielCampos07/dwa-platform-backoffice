import { HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { PlatformApiService } from './platform-api.service';

export type FeedPostAuthor = {
  id: string;
  maskedDisplayName: string;
  role: string;
};

export type FeedPostRecord = {
  id: string;
  authorMasked: string;
  contentPreview: string;
  body: string | null;
  labelId?: string | null;
  labelName?: string | null;
  accountId?: string | null;
  accountName?: string | null;
  type: string;
  createdAt: string;
  likeCount?: number;
  author?: FeedPostAuthor;
};

export type FeedPostsListResponse = {
  posts: FeedPostRecord[];
  total?: number;
  limit?: number;
  offset?: number;
};

export type FeedPostsListFilters = {
  accountId?: string;
  labelId?: string;
  limit?: number;
  offset?: number;
};

export type FeedModerationActionRecord = {
  id: string;
  postId: string;
  labelId?: string | null;
  labelName?: string | null;
  reason: string;
  operatorId: string;
  createdAt: string;
};

export type FeedModerationActionsListResponse = {
  actions: FeedModerationActionRecord[];
  total?: number;
  limit?: number;
  offset?: number;
};

export type FeedModerationActionsListFilters = {
  labelId?: string;
  limit?: number;
  offset?: number;
};

type RawFeedPost = Record<string, unknown>;

@Injectable({ providedIn: 'root' })
export class FeedModerationApiService {
  private readonly api = inject(PlatformApiService);
  private readonly base = '/feed/posts';

  list(filters?: FeedPostsListFilters) {
    let params = new HttpParams();
    if (filters?.accountId?.trim()) {
      params = params.set('accountId', filters.accountId.trim());
    }
    if (filters?.labelId?.trim()) {
      params = params.set('labelId', filters.labelId.trim());
    }
    if (filters?.limit != null) {
      params = params.set('limit', String(filters.limit));
    }
    if (filters?.offset != null) {
      params = params.set('offset', String(filters.offset));
    }
    return this.api.get<FeedPostsListResponse>(this.base, { params }).pipe(
      map((res) => ({
        posts: (res.posts ?? []).map(normalizeFeedPost),
        total: res.total ?? res.posts?.length ?? 0,
        limit: res.limit,
        offset: res.offset,
      })),
    );
  }

  delete(postId: string, reason: string) {
    return this.api.delete<void>(`${this.base}/${postId}`, { reason });
  }

  listModerationActions(filters?: FeedModerationActionsListFilters) {
    let params = new HttpParams();
    if (filters?.labelId?.trim()) {
      params = params.set('labelId', filters.labelId.trim());
    }
    if (filters?.limit != null) {
      params = params.set('limit', String(filters.limit));
    }
    if (filters?.offset != null) {
      params = params.set('offset', String(filters.offset));
    }
    return this.api.get<FeedModerationActionsListResponse>('/feed/moderation-actions', { params }).pipe(
      map((res) => ({
        actions: (res.actions ?? []).map(normalizeModerationAction),
        total: res.total ?? res.actions?.length ?? 0,
        limit: res.limit,
        offset: res.offset,
      })),
    );
  }
}

function normalizeModerationAction(raw: RawFeedPost): FeedModerationActionRecord {
  return {
    id: String(raw['id'] ?? raw['postId'] ?? ''),
    postId: String(raw['postId'] ?? raw['id'] ?? ''),
    labelId: (raw['labelId'] as string | undefined) ?? null,
    labelName: (raw['labelName'] as string | undefined) ?? null,
    reason: String(raw['reason'] ?? '—'),
    operatorId: String(raw['operatorId'] ?? raw['operator'] ?? '—'),
    createdAt: String(raw['createdAt'] ?? raw['date'] ?? ''),
  };
}

function normalizeFeedPost(raw: RawFeedPost): FeedPostRecord {
  const author = raw['author'] as FeedPostAuthor | undefined;
  const authorMasked =
    (raw['authorMasked'] as string | undefined) ??
    author?.maskedDisplayName ??
    '—';

  const body = (raw['body'] as string | null | undefined) ?? null;
  const contentPreview =
    (raw['contentPreview'] as string | undefined) ??
    body?.trim() ??
    '(sem conteúdo)';

  const labelId = (raw['labelId'] as string | undefined) ?? null;
  const labelName = (raw['labelName'] as string | undefined) ?? null;

  return {
    id: String(raw['id'] ?? ''),
    authorMasked,
    contentPreview,
    body,
    labelId,
    labelName,
    accountId: (raw['accountId'] as string | undefined) ?? labelId,
    accountName: (raw['accountName'] as string | undefined) ?? labelName,
    type: String(raw['type'] ?? 'TEXT'),
    createdAt: String(raw['createdAt'] ?? ''),
    likeCount: typeof raw['likeCount'] === 'number' ? raw['likeCount'] : undefined,
    author,
  };
}
