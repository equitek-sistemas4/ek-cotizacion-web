import { createApiClient } from '@/services/http'

const quotationsApi = createApiClient()

export const createLinkQuotation = async ({
  name,
  user_id,
  contact_id,
}) => {
  const body = new URLSearchParams()
  body.append('name', name)
  body.append('user_id', user_id)
  body.append('contact_id', contact_id)
  const response = await quotationsApi.post('/quotations/create-link', body, {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  })

  return response.data?.data ?? response.data
}