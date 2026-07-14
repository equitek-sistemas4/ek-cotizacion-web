import axios from 'axios'
import { useAuthStore } from '@/stores/auth'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL
const skipNgrokWarning = import.meta.env.VITE_NGROK_SKIP_BROWSER_WARNING === 'true'
const unauthorizedEventName = 'api:unauthorized'

const notifyUnauthorized = () => {
  window.dispatchEvent(new CustomEvent(unauthorizedEventName))
}

const getAuthorizationValue = ({ accessToken, tokenType }) => {
  if (!accessToken) {
    return null
  }

  const normalizedTokenType = tokenType?.toLowerCase() === 'bearer' ? 'Bearer' : tokenType || 'Bearer'

  return `${normalizedTokenType} ${accessToken}`
}

export const addAuthorizationInterceptor = (api) => {
  api.interceptors.request.use((config) => {
    if (config.skipAuthorization) {
      return config
    }

    const authStore = useAuthStore()
    const authorization = getAuthorizationValue(authStore)
    const hasAuthorizationHeader =
      (typeof config.headers?.has === 'function' && config.headers.has('Authorization')) ||
      Boolean(config.headers?.Authorization)

    if (authorization && !hasAuthorizationHeader) {
      if (typeof config.headers?.set === 'function') {
        config.headers.set('Authorization', authorization)
      } else {
        config.headers = {
          ...config.headers,
          Authorization: authorization,
        }
      }
    }

    return config
  })
}

export const addUnauthorizedInterceptor = (api) => {
  api.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        notifyUnauthorized()
      }

      return Promise.reject(error)
    },
  )
}

export const createApiClient = () => {
  const api = axios.create({
    baseURL: apiBaseUrl,
    headers: {
      Accept: 'application/json',
      ...(skipNgrokWarning ? { 'ngrok-skip-browser-warning': 'true' } : {}),
    },
  })

  addAuthorizationInterceptor(api)
  addUnauthorizedInterceptor(api)

  return api
}

export { unauthorizedEventName }
