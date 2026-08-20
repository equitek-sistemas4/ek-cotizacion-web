<template>
  <v-snackbar v-model="successSnackbar" color="success" timeout="3000">
    Conversación de WhatsApp creada con éxito.
  </v-snackbar>

  <v-dialog v-model="isOpen" max-width="500">
    <v-card prepend-icon="mdi-whatsapp" title="Crear conversación de WhatsApp">
      <v-card-text>
        <v-autocomplete
          autocomplete="off"
          v-model="contactId"
          :items="contacts"
          :loading="contactsLoading"
          item-title="name"
          item-value="id"
          label="Contacto"
          no-data-text="No hay contactos disponibles"
          placeholder="Selecciona un contacto"
          required
        >
          <template #item="{ props, item }">
            <v-list-item
              v-bind="props"
              :subtitle="getContactSubtitle(item.raw)"
              :title="item.raw.name"
            />
          </template>
        </v-autocomplete>

        <v-alert
          v-if="errorMessage"
          class="mt-3"
          density="compact"
          type="error"
        >
          {{ errorMessage }}
        </v-alert>
      </v-card-text>

      <v-divider />

      <v-card-actions>
        <v-spacer />
        <v-btn text="Cancelar" variant="elevated" @click="isOpen = false" />
        <v-btn
          :disabled="!contactId"
          :loading="creating"
          color="success"
          text="Crear"
          variant="elevated"
          @click="createWhatsappChat"
        />
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { getContacts } from '@/services/contacts'
import { createChatWpp } from '@/services/chats_whatsapp'

const model = defineModel({ type: Boolean, default: false })
const emit = defineEmits(['created'])

const authStore = useAuthStore()
const contacts = ref([])
const contactId = ref(null)
const contactsLoading = ref(false)
const creating = ref(false)
const errorMessage = ref('')
const successSnackbar = ref(false)

const isOpen = computed({
  get: () => model.value,
  set: (value) => {
    model.value = value
  },
})

const loadContacts = async () => {
  contactsLoading.value = true
  errorMessage.value = ''

  try {
    const contactsList = await getContacts()
    contacts.value = contactsList.map((contact) => ({
      ...contact,
      id: contact.id ?? contact.contact_id,
      name: contact.name ?? contact.nombre ?? contact.display_name ?? '',
      company: contact.company ?? contact.empresa ?? '',
      phone: contact.phone_number ?? contact.tel_directo ?? contact.phone ?? '',
    }))
  } catch (error) {
    contacts.value = []
    errorMessage.value = error.message || 'No se pudieron cargar los contactos.'
  } finally {
    contactsLoading.value = false
  }
}

const getContactSubtitle = (contact) => [contact.company, contact.phone_number].filter(Boolean).join(' · ')

const createWhatsappChat = async () => {
  if (!contactId.value) {
    errorMessage.value = 'Selecciona un contacto.'
    return
  }

  creating.value = true
  errorMessage.value = ''

  try {
    const newChat = await createChatWpp({
      user_id: authStore.userId,
      contact_id: contactId.value,
    })

    emit('created', newChat)
    successSnackbar.value = true
    isOpen.value = false
  } catch (error) {
    errorMessage.value = error.message || 'No se pudo crear la conversación de WhatsApp.'
  } finally {
    creating.value = false
  }
}

watch(isOpen, (open) => {
  if (open) {
    contactId.value = null
    loadContacts()
  }
})
</script>
