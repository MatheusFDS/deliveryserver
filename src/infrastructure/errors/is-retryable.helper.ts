// src/infrastructure/errors/is-retryable.helper.ts

/**
 * Verifica se um erro genérico (de rede ou HTTP) é considerado "retryable".
 * Esta função é agnóstica a qualquer domínio de negócio.
 */
export function isGenericRetryableError(error: any): boolean {
  // Erros de rede do Axios/Node.js que valem a pena tentar novamente
  const retryableNetworkCodes = [
    'ECONNRESET',
    'ENOTFOUND',
    'ESOCKETTIMEDOUT',
    'ETIMEDOUT',
    'ECONNREFUSED',
    'EHOSTUNREACH',
    'EPIPE',
    'EAI_AGAIN',
  ];

  if (retryableNetworkCodes.includes(error.code)) {
    return true;
  }

  // Erros de status HTTP que indicam problemas temporários do servidor
  if (error.response?.status) {
    const status = error.response.status;
    // 5xx são erros de servidor, 408 é timeout, 429 é rate limit
    return status >= 500 || status === 408 || status === 429;
  }

  return false;
}
