export class PublicError extends Error {
  constructor(message, status = 400, code) { super(message); this.status = status; if (code) this.code = code; }
}

export const QUOTA_CODES = new Set(['insufficient_quota', 'billing_hard_limit_reached', 'credit_balance_exhausted', 'organization_spend_limit_exceeded', 'project_spend_limit_exceeded', 'organization_usage_limit_exceeded']);

// Do not reflect provider error messages: they may contain credentials.
export async function apiError(response, web = false) {
  let data; try { data = await response.json(); } catch {}
  return providerError(response.status, data, web);
}
export function providerError(status, data, web = false) {
  const code = data?.error?.code;
  if (status === 401) return new PublicError('La clave de OpenAI es inválida o fue revocada. Revisa OPENAI_API_KEY en el servidor y reinícialo.', 401);
  if (QUOTA_CODES.has(code)) return new PublicError('La API no tiene saldo o alcanzó su límite de gasto. Esta consulta no pudo completarse. Revisa la facturación y los límites del proyecto en OpenAI Platform y vuelve a intentar después de reponer saldo o ajustar el límite.', 402, code);
  if (status === 429) return new PublicError('La API alcanzó su límite temporal de solicitudes o tokens. Espera un momento y vuelve a intentar.', 429, 'rate_limit_exceeded');
  if (status === 404 || code === 'model_not_found') return new PublicError('El modelo configurado no existe o tu proyecto no tiene acceso. Revisa OPENAI_MODEL y reinicia el servidor.', 400);
  if (status === 403) return new PublicError('El proyecto de OpenAI no tiene permiso para esta operación. Revisa los permisos de la clave y el acceso al modelo.', 403);
  if (status === 400) return new PublicError(web ? 'El modelo rechazó la consulta con búsqueda web. Prueba sin búsqueda o configura un modelo compatible.' : 'OpenAI rechazó el formato de la consulta. El modelo debe admitir Responses y salidas estructuradas para crear preguntas.', 400);
  return new PublicError('OpenAI no pudo completar la consulta. Inténtalo de nuevo en unos momentos.', 502);
}
