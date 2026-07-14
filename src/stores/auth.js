import { ref } from 'vue'
import { defineStore } from 'pinia'

const storedSession = JSON.parse(localStorage.getItem('authSession') || '{}')

export const useAuthStore = defineStore('auth', () => {
  const userId = ref(storedSession.userId ?? null)
  const user = ref(storedSession.user ?? null)
  const accessToken = ref(storedSession.accessToken ?? null)
  const tokenType = ref(storedSession.tokenType ?? null)

  const saveSession = () => {
    localStorage.setItem(
      'authSession',
      JSON.stringify({
        userId: userId.value,
        user: user.value,
        accessToken: accessToken.value,
        tokenType: tokenType.value,
      }),
    )
  }

  const setUserId = (id) => {
    userId.value = id
    saveSession()
  }

  const setSession = ({ user: userData, accessToken: token, tokenType: type }) => {
    user.value = userData
    userId.value = userData?.id ?? null
    accessToken.value = token ?? null
    tokenType.value = type ?? null
    saveSession()
  }

  const setToken = ({ accessToken: token, tokenType: type = 'Bearer', persist = true }) => {
    accessToken.value = token ?? null
    tokenType.value = type

    if (persist) {
      saveSession()
    }
  }

  const clearSession = () => {
    userId.value = null
    user.value = null
    accessToken.value = null
    tokenType.value = null
    localStorage.removeItem('authSession')
  }

  return {
    userId,
    user,
    accessToken,
    tokenType,
    setUserId,
    setSession,
    setToken,
    clearSession,
  }
})
