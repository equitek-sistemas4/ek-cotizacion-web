import { createApiClient } from '@/services/http'

const contactsApi = createApiClient()


export const getContacts = async () => {
  const response = await contactsApi.get('/contacts/list')

  return Array.isArray(response.data?.data) ? response.data.data : []
}


export const getContactsRequests = async (status) => {
  try {
    const response = await contactsApi.get(`/contacts/list-requests/${status}`)
    return Array.isArray(response.data?.data) ? response.data.data : []
  } catch (error) {
    console.error('Error fetching contact requests:', error)
    return []
  }
}


export const approveContactRequest = async (contact_request_id) => {
  const body = new URLSearchParams()
  body.append('contact_request_id', contact_request_id)

  const response = await contactsApi.post(`/contacts/requests/${contact_request_id}/approve`, body, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  })

  return response.data?.data ?? response.data
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
  company,
  position,
}) => {
  const body = new URLSearchParams()
  body.append('name', name)
  body.append('phone_number', phone_number)
  body.append('display_name', display_name)
  body.append('company', company)
  body.append('position', position)
  const response = await contactsApi.post(`/contacts/create`, body, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  })
  
  return response.data?.data ?? response.data
}


export const createContactRequest = async ({
  chat_id,
  contact_name,
  contact_phone_number,
  contact_display_name,
  contact_company,
  contact_position,
}) => {
  const body = new URLSearchParams()
  body.append('chat_id', chat_id)
  body.append('contact_name', contact_name)
  body.append('contact_phone_number', contact_phone_number)
  body.append('contact_display_name', contact_display_name)
  body.append('contact_company', contact_company)
  body.append('contact_position', contact_position)
  const response = await contactsApi.post(`/contacts/create-request`, body, {
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
  company,
  position
}) => {
  const body = new URLSearchParams()
  body.append('contact_id', contact_id)
  body.append('name', name)
  body.append('phone_number', phone_number)
  body.append('display_name', display_name)
  body.append('company', company)
  body.append('position', position)
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
