import { createApiClient } from '@/services/http'

const whatsappApi = createApiClient()


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


export const getChatMessagesWpp = async ({ accessToken, phone_number } = {}) => {
  const config = getAuthorizationConfig(accessToken)

  if (phone_number) {
    config.params = { phone_number }
  }

  const response = await whatsappApi.get(
    `/whatsapp/messages/received`,
    config,
  )

  return response.data?.data ?? null
}


export const sendWhatsappMessage = async ({
  to,
  text,
}) => {
  const body = new URLSearchParams()
    body.append('to', to)
    body.append('text', text)
    const response = await whatsappApi.post(`/whatsapp/send`, body, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
    })

    return response.data?.data ?? response.data
}


export const sendTemplateMeta = async ({
  to,
  clientName,
  sellerWhatsapp,
  sellerEmail,
  sellerName,
  urlCode,
  messaging_product = 'whatsapp',
  recipient_type = 'individual',
  type = 'template',
  templateName = 'envia_cotizacion_web',
  languageCode = 'es_MX',
} = {}) => {
  const response = await whatsappApi.post('/whatsapp/send-template-meta', {
    messaging_product: messaging_product,
    recipient_type: recipient_type,
    to: to,
    type: type,
    template: {
      name: templateName,
      language: {
        code: languageCode,
      },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: clientName },
            { type: 'text', text: sellerWhatsapp },
            { type: 'text', text: sellerEmail },
            { type: 'text', text: sellerName },
          ],
        },
        {
          type: 'button',
          sub_type: 'url',
          index: 0,
          parameters: [
            {
              type: 'text',
              text: urlCode,
            },
          ],
        },
      ],
    },
  })

  return response.data?.data ?? response.data
}


export const sendTemplateAddContact = async ({
  to,
  clientName,
  sellerWhatsapp,
  sellerEmail,
  sellerName,
  urlCode,
  messaging_product = 'whatsapp',
  recipient_type = 'individual',
  type = 'template',
  templateName = 'contact_request',
  languageCode = 'es_MX',
} = {}) => {
  const response = await whatsappApi.post('/whatsapp/send-template-meta', {
    messaging_product: messaging_product,
    recipient_type: recipient_type,
    to: to,
    type: type,
    template: {
      name: templateName,
      language: {
        code: languageCode,
      },
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: clientName },
            { type: 'text', text: sellerWhatsapp },
            { type: 'text', text: sellerEmail },
            { type: 'text', text: sellerName },
          ],
        },
        {
          type: 'button',
          sub_type: 'url',
          index: 0,
          parameters: [
            {
              type: 'text',
              text: urlCode,
            },
          ],
        },
      ],
    },
  })

  return response.data?.data ?? response.data
}


export const sendTemplate = async ({
  to,
  text,
  messaging_product = 'whatsapp',
  recipient_type = 'individual',
  type = 'template',
  templateName = 'enviar_cotizacion',
  languageCode = 'es_MX',
} = {}) => {
  const response = await whatsappApi.post('/whatsapp/send-template', {
    messaging_product: messaging_product,
    recipient_type: recipient_type,
    to: to,
    type: type,
    template: {
      name: templateName,
      language: {
        code: languageCode,
      },
      components: [
        {
          type: 'url',
          parameters: [
            {
              type: 'text',
              text: text,
            }
          ]
        }
      ]
    }
  })
  return response.data?.data ?? response.data
}
