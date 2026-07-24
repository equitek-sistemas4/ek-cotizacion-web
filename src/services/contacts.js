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

export const createContact = async ({
  name,
  phone_number,
  display_name,
  company
}) => {
  const body = new URLSearchParams()
  body.append('name', name)
  body.append('phone_number', phone_number)
  body.append('display_name', display_name)
  body.append('company', company)
  const response = await contactsApi.post(`/contacts/create`, body, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  })
  
  return response.data?.data ?? response.data
}

export const updateContact = async ({
  contact_id,
  name,
  phone_number,
  display_name,
  company
}) => {
  const body = new URLSearchParams()
  body.append('contact_id', contact_id)
  body.append('name', name)
  body.append('phone_number', phone_number)
  body.append('display_name', display_name)
  body.append('company', company)
  const response = await contactsApi.put(`/contacts/update/${contact_id}`, body, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  })

  return response.data?.data ?? response.data
}

export const deleteContact = async ({
  contact_id
}) => {
  const response = await contactsApi.delete(`/contacts/delete/${contact_id}`, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  })

  return response.data?.data ?? response.data
}