import { createApiClient } from '@/services/http'

const integrationApi = createApiClient()

/**
 * Valida un token de integración de cotización
 * @param {string} token - Token de integración
 * @param {string} chatId - ID del chat
 * @returns {Promise<Object>} Datos del token validado
 */
export const validateIntegrationToken = async (token, chatId) => {
  try {
    const response = await integrationApi.post(
      `/chats/validate-token`,
      new URLSearchParams({
        token,
        chat_id: chatId,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        skipAuthorization: true,
      },
    )

    return response.data?.data ?? response.data
  } catch (error) {
    console.error('Error validating integration token:', error)
    throw error
  }
}

/**
 * Decodifica y verifica un JWT token localmente (útil para validación rápida)
 * @param {string} token - Token JWT
 * @returns {Object|null} Payload decodificado o null si es inválido
 */
export const decodeIntegrationToken = (token) => {
  try {
    if (!token || typeof token !== 'string') {
      return null
    }

    const parts = token.split('.')
    if (parts.length !== 3) {
      return null
    }

    const payload = parts[1]
    const normalizedPayload = payload.replace(/-/g, '+').replace(/_/g, '/')
    const decodedPayload = atob(normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, '='))

    return JSON.parse(decodedPayload)
  } catch (error) {
    console.error('Error decoding integration token:', error)
    return null
  }
}

/**
 * Verifica si el token ha expirado
 * @param {string} token - Token JWT
 * @returns {boolean} true si ha expirado
 */
export const isTokenExpired = (token) => {
  const payload = decodeIntegrationToken(token)

  if (!payload || !payload.exp) {
    return true
  }

  // exp está en segundos
  const expirationTime = payload.exp * 1000
  const currentTime = Date.now()

  return currentTime > expirationTime
}
