import { createApiClient } from '@/services/http'

const contactsApi = createApiClient()

export const getContacts = async () => {
  const response = await contactsApi.get('/contacts/list')

  return Array.isArray(response.data?.data) ? response.data.data : []
}


export const getContactsAvailableChat = async (chatId) => {
  try {
    const response = await contactsApi.get(`/contacts/availables/chat/${chatId}`)
    return Array.isArray(response.data?.data) ? response.data.data : []
  } catch (error) {
    console.error('Error fetching contacts by chat ID:', error)
    return []
  }
}