import { createApiClient } from '@/services/http'

const whatsappApi = createApiClient()

export const sendTemplateMeta = async ({
  to,
  text,
  messaging_product = 'whatsapp',
  recipient_type = 'individual',
  type = 'template',
  templateName = 'envia_cotizacion_web',
  languageCode = 'en',
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
          type: 'button',
          sub_type: 'url',
          index: 0,
          parameters: [
            {
              type: 'text',
              text: text,
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
  languageCode = 'en',
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