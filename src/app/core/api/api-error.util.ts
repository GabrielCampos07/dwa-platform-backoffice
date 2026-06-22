/** Maps HTTP errors from platform-api to user-facing Portuguese messages. */
export function friendlyPlatformApiError(err: { status?: number; error?: { message?: string } }, fallback: string): string {
  switch (err?.status) {
    case 0:
      return 'Platform API indisponível. Verifique se está rodando na porta 3010.';
    case 401:
      return 'Chave de API inválida.';
    case 404:
      return 'Endpoint ainda não disponível na platform-api.';
    case 503:
      return 'Platform API não configurada no servidor.';
    default:
      return err?.error?.message ?? fallback;
  }
}
