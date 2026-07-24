import { createApiClient } from '@/services/http'

const quotationsApi = createApiClient()

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

export const createLinkQuotation = async ({ name, user_id, contact_id, quotation_id }) => {
  const body = new URLSearchParams()
  body.append('name', name)
  body.append('user_id', user_id)
  body.append('contact_id', contact_id)
  body.append('quotation_id', quotation_id)
  const response = await quotationsApi.post('/quotations/create-link', body, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  })

  return response.data?.data ?? response.data
}

export const getQuotationInfo = async (quotation_id, { accessToken } = {}) => {
  const response = await quotationsApi.get(
    `/quotations/${quotation_id}/info`,
    getAuthorizationConfig(accessToken),
  )

  return response.data?.data ?? response.data ?? null
}

export const getQuotationProducts = async (quotation_id, { accessToken } = {}) => {
  const response = await quotationsApi.get(
    `/quotations/${quotation_id}/products`,
    getAuthorizationConfig(accessToken),
  )

  return response.data?.data ?? null
}

export const getQuotationCosts = async (quotation_id, { accessToken } = {}) => {
  const response = await quotationsApi.get(
    `/quotations/${quotation_id}/costs`,
    getAuthorizationConfig(accessToken),
  )

  return response.data?.data ?? null
}

export const getQuotationConditions = async (quotation_id, { accessToken } = {}) => {
  const response = await quotationsApi.get(
    `/quotations/${quotation_id}/conditions`,
    getAuthorizationConfig(accessToken),
  )

  return response.data?.data ?? null
}

export const getQuotationEquipment = async (quotation_id, { accessToken } = {}) => {
  const response = await quotationsApi.get(
    `/quotations/${quotation_id}/equipment`,
    getAuthorizationConfig(accessToken),
  )

  return response.data?.data ?? null
}
