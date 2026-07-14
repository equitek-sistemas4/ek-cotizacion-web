import { createApiClient } from '@/services/http'

const chatsApi = createApiClient()

const getAuthorizationConfig = (accessToken) => {
  if (!accessToken) {
    return {}
  }

  return {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  }
}

export const getChats = async () => {
  const response = await chatsApi.get('/chats/list')

  return Array.isArray(response.data?.data) ? response.data.data : []
}

export const getChatById = async (chatId, { accessToken } = {}) => {
  const response = await chatsApi.get(`/chats/${chatId}`, getAuthorizationConfig(accessToken))

  return response.data?.data ?? null
}

export const getChatMessages = async (chatId, { accessToken } = {}) => {
  const response = await chatsApi.get(
    `/chats/${chatId}/messages`,
    getAuthorizationConfig(accessToken),
  )

  return response.data?.data ?? null
}

export const getChatMemberByCode = async (access_code) => {
  const response = await chatsApi.get(`/chat_members/by-code/${encodeURIComponent(access_code)}`, {
    skipAuthorization: true,
  })

  return response.data?.data ?? null
}

export const addMember = async ({
  chat_id,
  contact_id,
}) => {
  const body = new URLSearchParams()
  body.append('chat_id', chat_id)
  body.append('contact_id', contact_id)
  const response = await chatsApi.post(`/chats/${chat_id}/members`, body, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  })
  
  return response.data?.data ?? response.data
}

export const sendChatMessage = async ({
  chat_id,
  sender_id,
  sender_type,
  text,
  file,
  accessToken,
}) => {
  const body = new FormData()
  body.append('chat_id', chat_id)
  body.append('sender_id', sender_id)
  body.append('sender_type', sender_type)
  body.append('text', text)

  if (file) {
    body.append('file', file)
  }

  const response = await chatsApi.post(
    '/chat_messages/send',
    body,
    {
      headers: {
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
    },
  )

  return response.data?.data ?? response.data
}
