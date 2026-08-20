import { createApiClient } from '@/services/http'

const chatsWppApi = createApiClient()

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


export const getChatsWpp = async () => {
    const response = await chatsWppApi.get('/chats-whatsapp/list')

    return Array.isArray(response.data?.data) ? response.data.data : []
}


export const createChatWpp = async ({
    user_id,
    contact_id,
}) => {
    const body = new URLSearchParams()
    body.append('user_id', user_id)
    body.append('contact_id', contact_id)
    const response = await chatsWppApi.post(`/chats-whatsapp/create`, body, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    })

    return response.data?.data ?? response.data
}