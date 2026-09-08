<template>
  <v-dialog v-model="dialog" max-width="600">
    <template v-slot:activator="{ props: activatorProps }">
      <slot name="activator" :props="activatorProps">
        <v-btn v-bind="activatorProps" />
      </slot>
    </template>

    <v-card prepend-icon="mdi-account-plus" title="Solicitar Acceso al Chat para Nuevo Participante">
      <v-card-text>
        <v-row density="comfortable">
          <v-col cols="12">
            <v-text-field
              autocomplete="off"
              v-model="form.name"
              :rules="[requiredRule]"
              label="Nombre"
              placeholder="Ingrese el nombre"
              required
              outlined
              dense
            />
          </v-col>

          <v-col cols="4" sm="3">
            <v-select
              v-model="phoneCountryCode"
              :items="phoneCountryCodes"
              item-title="label"
              item-value="value"
              label="Lada"
              variant="outlined"
              density="comfortable"
              hide-details
            />
          </v-col>

          <v-col cols="8" sm="9">
            <v-text-field
              v-model="form.phone_number"
              :rules="[phoneRule]"
              autocomplete="tel-national"
              label="Teléfono"
              placeholder="10 dígitos"
              inputmode="numeric"
              maxlength="10"
              required
              variant="outlined"
              density="comfortable"
              @update:model-value="sanitizePhone"
            />
          </v-col>

          <v-col cols="12">
            <v-text-field
              v-model="form.email"
              :rules="[requiredRule, emailRule]"
              autocomplete="email"
              label="Correo electrónico"
              placeholder="Ingrese el correo electrónico"
              type="email"
              required
              outlined
              dense
            />
          </v-col>

          <v-col cols="12">
            <v-text-field
              autocomplete="off"
              v-model="form.display_name"
              :rules="[requiredRule]"
              label="Nombre Mostrado"
              placeholder="Ingrese el nombre mostrado"
              required
              outlined
              dense
            />
          </v-col>

          <v-col cols="12">
            <v-text-field
              autocomplete="off"
              v-model="form.company"
              :rules="[requiredRule]"
              label="Empresa"
              placeholder="Ingrese la empresa"
              required
              outlined
              dense
            />
          </v-col>

          <v-col cols="12">
            <v-text-field
              autocomplete="off"
              v-model="form.position"
              :rules="[requiredRule]"
              label="Puesto"
              placeholder="Puesto en la empresa"
              required
              outlined
              dense
            />
          </v-col>
        </v-row>

        <v-alert
          v-if="errorMessage"
          type="error"
          class="mt-4"
          dismissible
        >
          {{ errorMessage }}
        </v-alert>
      </v-card-text>

      <v-divider></v-divider>

      <v-card-actions>
        <v-spacer></v-spacer>

        <v-btn
          color="secondary"
          text="Cancelar"
          variant="elevated"
          @click="closeDialog"
        />

        <v-btn
          color="primary"
          text="Crear"
          variant="elevated"
          :loading="loading"
          @click="handleCreateContact"
        />
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getChatById, getChatMemberByCode } from '@/services/chats'
import { createContactRequest } from '@/services/contacts'
import { createNotification } from '@/services/notifications'
import { getQuotationInfo } from '@/services/quotations'

const route = useRoute()
const emit = defineEmits(['contact-created'])
const props = defineProps({
  chatId: {
    type: [String, Number],
    required: true,
  },
  contactId: {
    type: [String, Number],
    default: null,
  },
  accessToken: {
    type: String,
    default: '',
  },
  quotationId: {
    type: [String, Number],
    default: null,
  },
})

const dialog = ref(false)
const loading = ref(false)
const errorMessage = ref('')
const phoneCountryCode = ref('+52')
const quotationInfo = ref(null)

const phoneCountryCodes = [
  { label: 'MX (+52)', value: '+52' },
  { label: 'EUA (+1)', value: '+1' },
]

const form = ref({
  name: '',
  phone_number: '',
  email: '',
  display_name: '',
  company: '',
  position: '',
})

const closeDialog = () => {
  dialog.value = false
  clearForm()
}

const clearForm = () => {
  form.value = {
    name: '',
    phone_number: '',
    email: '',
    display_name: '',
    company: quotationInfo.value?.empresa ?? '',
    position: '',
  }
  phoneCountryCode.value = '+52'
  errorMessage.value = ''
}

const loadQuotationInfo = async (quotationId) => {
  if (!quotationId) {
    quotationInfo.value = null
    return
  }

  try {
    quotationInfo.value = await getQuotationInfo(quotationId, {
      accessToken: props.accessToken,
    })
    form.value.company = quotationInfo.value?.quotation_info.empresa ?? ''
  } catch (error) {
    console.error('No se pudo obtener la información de la cotización:', error)
  }
}

watch(
  () => props.quotationId,
  loadQuotationInfo,
  { immediate: true },
)

const sanitizePhone = (value) => {
  form.value.phone_number = String(value ?? '').replace(/\D/g, '').slice(0, 10)
}

const requiredRule = (value) => {
  return String(value ?? '').trim() ? true : 'Este campo es requerido'
}

const phoneRule = (value) => {
  if (!value) return 'El teléfono es requerido'
  return /^\d{10}$/.test(value) || 'Ingresa un teléfono válido de 10 dígitos'
}

const emailRule = (value) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || 'Ingresa un correo electrónico válido'
}

const handleCreateContact = async () => {
  const requiredFields = [
    ['name', 'nombre'],
    ['phone_number', 'teléfono'],
    ['email', 'correo electrónico'],
    ['display_name', 'nombre mostrado'],
    ['company', 'empresa'],
    ['position', 'puesto'],
  ]
  const missingField = requiredFields.find(([field]) => requiredRule(form.value[field]) !== true)

  if (missingField) {
    errorMessage.value = `El campo ${missingField[1]} es requerido`
    return
  }

  const phoneValidation = phoneRule(form.value.phone_number)
  if (phoneValidation !== true) {
    errorMessage.value = phoneValidation
    return
  }

  const emailValidation = emailRule(form.value.email)
  if (emailValidation !== true) {
    errorMessage.value = emailValidation
    return
  }

  if (!props.chatId) {
    errorMessage.value = 'No se pudo identificar el chat de la solicitud'
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    const chat = await getChatById(props.chatId, { accessToken: props.accessToken })
    const member = chat?.members?.find(
      (item) => String(item.contact_id) === String(props.contactId),
    )
    const contact = member?.contact

    if (!contact?.idempresa_contacto || !contact?.fk_idempresa) {
      throw new Error('No se pudo obtener la información de empresa del contacto del chat.')
    }

    await createContactRequest({
      chat_id: props.chatId,
      contact_name: form.value.name,
      contact_phone_number: `${phoneCountryCode.value}${form.value.phone_number}`,
      contact_email: form.value.email,
      contact_display_name: form.value.display_name,
      contact_company: form.value.company,
      contact_position: form.value.position,
      idempresa_contacto: contact.idempresa_contacto,
      fk_idempresa: contact.fk_idempresa,
    })

    const chatMember = await getChatMemberByCode(route.params.access_code)

    if (chatMember?.user_id) {
      await createNotification({
        user_id: chatMember.user_id,
        section: 'contact-requests',
      })
    }

    clearForm()
    emit('contact-created', { chat_id: props.chatId })
    dialog.value = false
  } catch (error) {
    console.error('Error al crear contacto:', error)
    errorMessage.value =
      error.response?.data?.message ||
      'Error al crear el contacto. Por favor, intenta de nuevo.'
  } finally {
    loading.value = false
  }
}
</script>
