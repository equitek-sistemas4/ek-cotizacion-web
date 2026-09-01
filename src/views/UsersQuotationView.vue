<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { getChatById } from '@/services/chats'
import { useAuthStore } from '@/stores/auth'
import infoClientQuotation from '@/components/infoClientQuotation.vue'

const route = useRoute()
const authStore = useAuthStore()

const chatId = ref(null)
const loading = ref(false)
const errorMessage = ref('')
const chat = ref(null)
const quotationId = ref(null)
const token = ref('')
const contactId = ref(null)
const userId = ref(null)

const chatTitle = computed(() => chat.value?.name + (chat.value?.quotation_id ? ` #${chat.value.quotation_id}` : '') || 'Cotización')

const loadQuotation = async () => {
  loading.value = true
  errorMessage.value = ''

  try {
    // Obtener el chatId de los parámetros de la ruta
    chatId.value = route.params.chatId
    
    if (!chatId.value) {
      throw new Error('No se pudo identificar la cotización.')
    }

    // Usar el token del usuario autenticado
    token.value = authStore.accessToken
    userId.value = authStore.userId

    // Cargar la información del chat/cotización
    const chatDetail = await getChatById(chatId.value, { accessToken: token.value })
    
    chat.value = chatDetail
    quotationId.value = chatDetail?.quotation_id ?? null
    
    // Establecer el contactId del usuario actual si es miembro del chat
    const userMember = chat.value?.members?.find(
      (item) => String(item.user_id) === String(userId.value),
    )
    contactId.value = userMember?.contact_id ?? null

    if (!quotationId.value) {
      errorMessage.value = 'Esta cotización no tiene información disponible.'
    }
  } catch (error) {
    errorMessage.value = error.message || 'Ocurrió un error al cargar la cotización.'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadQuotation()
})
</script>

<template>
  <v-container class="users-quotation-view" fluid>
    <div v-if="loading" class="quotation-state">
      <v-progress-circular color="primary" indeterminate size="32" />
      <span>Cargando cotización...</span>
    </div>

    <v-alert v-else-if="errorMessage" type="error" variant="tonal">
      {{ errorMessage }}
    </v-alert>

    <template v-else>
      <info-client-quotation
        v-if="token"
        :chat-title="chatTitle"
        :contact-name="''"
        :error-message="errorMessage"
        :loading="loading"
        :contact-id="contactId"
        :quotation-id="quotationId"
        :access-token="token"
      />
    </template>
  </v-container>
</template>

<style scoped>
.users-quotation-view {
  width: 100%;
  min-height: 100vh;
  min-height: 100dvh;
  padding: 24px;
  background: rgb(var(--v-theme-appBackground));
}

.quotation-state {
  display: grid;
  place-items: center;
  gap: 12px;
  min-height: 240px;
  color: rgb(var(--v-theme-textMuted));
}
</style>
