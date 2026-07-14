import { createApiClient } from '@/services/http'

const authApi = createApiClient()

export const login = async ({ email, password }) => {
  const body = new URLSearchParams()
  body.append('email', email)
  body.append('password', password)

  const response = await authApi.post('/auth/login', body, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  })

  return response.data
}


export const generate_access_token_contact = async ({ chat_id, contact_id }) => {
  const body = new URLSearchParams()
  body.append('chat_id', chat_id)
  body.append('contact_id', contact_id)

  const response = await authApi.post('/auth/chat-contact-token', body, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  })
}