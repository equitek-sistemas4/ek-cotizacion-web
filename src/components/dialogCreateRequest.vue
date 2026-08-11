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
              label="Nombre"
              placeholder="Ingrese el nombre"
              required
              outlined
              dense
            />
          </v-col>

          <v-col cols="12">
            <v-text-field
              autocomplete="off"
              v-model="form.phone_number"
              label="Teléfono"
              placeholder="Ingrese el número de teléfono"
              required
              outlined
              dense
            />
          </v-col>

          <v-col cols="12">
            <v-text-field
              v-model="form.email"
              autocomplete="email"
              label="Correo electrónico"
              placeholder="Ingrese el correo electrónico"
              type="email"
              outlined
              dense
            />
          </v-col>

          <v-col cols="12">
            <v-text-field
              autocomplete="off"
              v-model="form.display_name"
              label="Nombre Mostrado"
              placeholder="Ingrese el nombre mostrado"
              outlined
              dense
            />
          </v-col>

          <v-col cols="12">
            <v-text-field
              autocomplete="off"
              v-model="form.company"
              label="Empresa"
              placeholder="Ingrese la empresa"
              outlined
              dense
            />
          </v-col>

          <v-col cols="12">
            <v-text-field
              autocomplete="off"
              v-model="form.position"
              label="Puesto"
              placeholder="Puesto en la empresa"
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
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { getChatById, getChatMemberByCode } from '@/services/chats'
import { createContactRequest } from '@/services/contacts'
import { createNotification } from '@/services/notifications'

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
})

const dialog = ref(false)
const loading = ref(false)
const errorMessage = ref('')

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
    company: '',
    position: '',
  }
  errorMessage.value = ''
}

const handleCreateContact = async () => {
  // Validación básica
  if (!form.value.name || !form.value.phone_number) {
    errorMessage.value = 'El nombre y teléfono son campos requeridos'
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
      contact_phone_number: form.value.phone_number,
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

    emit('contact-created', { chat_id: props.chatId })
    closeDialog()
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
