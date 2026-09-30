import { createApiClient } from '@/services/http'

const quotEventsApi = createApiClient()

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


export const getQuotationEvents = async () => {
  const response = await quotEventsApi.get('/quotation-events/list')

  return Array.isArray(response.data?.data) ? response.data.data : []
}


export const getQuotationContactsEvents = async (quotation_id) => {
  const response = await quotEventsApi.get(`/quotation-events/contacts-events/${quotation_id}`)

  return Array.isArray(response.data?.data?.contacts) ? response.data.data.contacts : []
}


export const createQuotationEvent = async ({
  quotation_id,
  contact_id,
  event_name,
  section_key,
  element_key,
  accessToken,
}) => {
  const body = new URLSearchParams()
  body.append('quotation_id', quotation_id)
  body.append('contact_id', contact_id)
  body.append('event_name', event_name)
  body.append('section_key', section_key)
  body.append('element_key', element_key)
  const authorizationConfig = getAuthorizationConfig(accessToken)
  const response = await quotEventsApi.post(`/quotation-events/create`, body, {
    ...authorizationConfig,
    headers: {
      ...authorizationConfig.headers,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  })
  
  return response.data?.data ?? response.data
}

export const registerSectionOpened = async ({ quotationId, contactId, sectionKey, accessToken }) => {
  const body = new URLSearchParams()
  body.append('quotation_id', quotationId)
  body.append('contact_id', contactId)
  body.append('section_key', sectionKey)

  const authorizationConfig = getAuthorizationConfig(accessToken)
  const response = await quotEventsApi.post('/quotation-events/section-opened', body, {
    ...authorizationConfig,
    headers: {
      ...authorizationConfig.headers,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  })

  return response.data?.data ?? response.data
}

export const getQuotationRanking = async (quotationId, { accessToken } = {}) => {
  const response = await quotEventsApi.get(
    `/quotation-events/${quotationId}/ranking`,
    getAuthorizationConfig(accessToken),
  )

  return response.data?.data ?? response.data ?? null
}
