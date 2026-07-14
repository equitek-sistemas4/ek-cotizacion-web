<script setup>
import { shallowRef, computed, ref, watch } from 'vue'
import { getChatById } from '@/services/chats'
import { sendTemplateMeta } from '@/services/whatsapp'

const props = defineProps({
  chatId: {
    type: [Number, String],
    default: null,
  },
})

const dialog = shallowRef(false)
const chat = ref(null)
const loading = ref(false)
const errorMessage = ref('')
const copiedMemberId = ref(null)
const sendingWhatsappMemberId = ref(null)

const members = computed(() => (Array.isArray(chat.value?.members) ? chat.value.members : []))
const baseUrl = import.meta.env.VITE_BASE_URL_WEB?.replace(/\/$/, '') ?? ''

const formatDate = (dateValue) => {
  if (!dateValue) {
    return ''
  }

  const date = new Date(dateValue)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toLocaleString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const loadChat = async () => {
  chat.value = null
  errorMessage.value = ''

  if (!props.chatId) {
    return
  }

  loading.value = true

  try {
    chat.value = await getChatById(props.chatId)
  } catch (error) {
    errorMessage.value = error.message || 'Ocurrio un error al cargar la informacion del chat.'
  } finally {
    loading.value = false
  }
}

const sendTemplateMetaMessage = async (
  to,
  text,
) => {
  try {
    const response = await sendTemplateMeta({
      to: to,
      text: text,
    })
    console.log('Template meta sent successfully:', response)
  } catch (error) {
    console.error('Error sending template meta:', error)
  }
}

const sendMemberUrlByWhatsapp = async (member) => {
  const accessCode = member?.access_code
  const phoneNumber = member.contact?.phone_number

  if (!accessCode || !phoneNumber) {
    return
  }

  sendingWhatsappMemberId.value = member.id

  try {
    await sendTemplateMetaMessage(phoneNumber, accessCode)
  } finally {
    sendingWhatsappMemberId.value = null
  }
}

const getMemberUrl = (member) => {
  console.log('member:', member)
  const access_code = member?.access_code
  if (!access_code) {
    return ''
  }

  return `${baseUrl}/contact-chat/${access_code}`
}

const copyText = async (text) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textArea = document.createElement('textarea')
  textArea.value = text
  textArea.setAttribute('readonly', '')
  textArea.style.position = 'fixed'
  textArea.style.opacity = '0'
  document.body.appendChild(textArea)
  textArea.select()
  document.execCommand('copy')
  document.body.removeChild(textArea)
}

const copyMemberUrl = async (member) => {
  const memberUrl = getMemberUrl(member)

  if (!memberUrl) {
    return
  }

  await copyText(memberUrl)
  copiedMemberId.value = member.id

  window.setTimeout(() => {
    if (copiedMemberId.value === member.id) {
      copiedMemberId.value = null
    }
  }, 1400)
}

watch(() => props.chatId, loadChat, { immediate: true })
</script>

<template>
    <div class="pa-4 text-center">
        <v-dialog
            v-model="dialog"
            max-width="600"
        >
            <template v-slot:activator="{ props: activatorProps }">
                <v-btn
                    class="text-none font-weight-regular"
                    icon="mdi-information-outline"
                    variant="outlined"
                    v-bind="activatorProps"
                ></v-btn>
            </template>

            <v-card class="info-chat-card" elevation="0">
                <v-card-text>
                <div v-if="loading" class="info-chat-state">
                    <v-progress-circular color="primary" indeterminate size="28" />
                    <span>Cargando informacion del chat...</span>
                </div>

                <div v-else-if="errorMessage" class="info-chat-state info-chat-error">
                    <v-icon color="error" icon="mdi-alert-circle-outline" />
                    <span>{{ errorMessage }}</span>
                </div>

                <div v-else-if="!chat" class="info-chat-state">
                    <v-icon color="primary" icon="mdi-chat-outline" />
                    <span>Selecciona un chat para ver sus miembros.</span>
                </div>

                <div v-else class="info-chat-content">
                    <header class="info-chat-header">
                    <v-avatar color="primary" size="44">
                        <span>{{ chat.name?.charAt(0) || 'C' }}</span>
                    </v-avatar>

                    <div>
                        <p>Chat #{{ chat.id }}</p>
                        <h2>{{ chat.name }}</h2>
                        <small>Creado: {{ formatDate(chat.created_at) }}</small>
                    </div>
                    </header>

                    <v-divider />

                    <section>
                    <div class="members-heading">
                        <h3>Miembros</h3>
                        <v-chip color="primary" size="small" variant="tonal">
                        {{ members.length }}
                        </v-chip>
                    </div>

                    <div v-if="!members.length" class="info-chat-state">
                        <v-icon color="primary" icon="mdi-account-group-outline" />
                        <span>Este chat no tiene miembros.</span>
                    </div>

                    <v-list v-else class="members-list" density="comfortable">
                        <v-list-item v-for="member in members" :key="member.id" rounded="lg">
                        <template #prepend>
                            <v-avatar color="secondary" size="36">
                            <span>{{ (member.contact?.display_name || member.contact_name || 'M').charAt(0) }}</span>
                            </v-avatar>
                        </template>

                        <v-list-item-title>
                            {{ member.contact?.display_name || member.contact_name || 'Sin nombre' }}
                        </v-list-item-title>

                        <v-list-item-subtitle>
                            {{ member.contact?.company || 'Sin empresa' }}
                            <span v-if="member.contact?.phone_number"> · {{ member.contact.phone_number }}</span>
                        </v-list-item-subtitle>

                        <div class="member-url">
                            <span>{{ getMemberUrl(member) || 'URL no disponible' }}</span>
                            <v-tooltip text="enviar por WhatsApp">
                                <template #activator="{ props: tooltipProps }">
                                    <v-btn
                                        aria-label="Enviar URL por WhatsApp"
                                        color="success"
                                        icon="mdi-whatsapp"
                                        :disabled="!getMemberUrl(member) || !member.contact?.phone_number"
                                        :loading="sendingWhatsappMemberId === member.id"
                                        size="x-small"
                                        variant="text"
                                        v-bind="tooltipProps"
                                        @click.stop="sendMemberUrlByWhatsapp(member)"
                                    />
                                </template>
                            </v-tooltip>
                            <v-btn
                                :aria-label="copiedMemberId === member.id ? 'URL copiada' : 'Copiar URL'"
                                :color="copiedMemberId === member.id ? 'success' : 'primary'"
                                :icon="copiedMemberId === member.id ? 'mdi-check' : 'mdi-content-copy'"
                                size="x-small"
                                variant="text"
                                @click.stop="copyMemberUrl(member)"
                            />
                        </div>

                        <template #append>
                            <span class="member-date">{{ formatDate(member.created_at) }}</span>
                        </template>
                        </v-list-item>
                    </v-list>
                    </section>
                </div>
                </v-card-text>
            </v-card>
        </v-dialog>
    </div>
</template>

<style scoped>
.info-chat-card {
  border: 1px solid rgb(var(--v-theme-border));
  border-radius: 8px;
  background: rgb(var(--v-theme-surface));
}

.info-chat-state {
  display: grid;
  place-items: center;
  gap: 10px;
  min-height: 120px;
  color: rgb(var(--v-theme-textMuted));
  font-size: 0.9rem;
  text-align: center;
}

.info-chat-error {
  color: rgb(var(--v-theme-error));
}

.info-chat-content {
  display: grid;
  gap: 16px;
}

.info-chat-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.info-chat-header span,
.members-list :deep(.v-avatar span) {
  color: rgb(var(--v-theme-surface));
  font-weight: 700;
}

.info-chat-header p,
.info-chat-header small {
  margin: 0;
  color: rgb(var(--v-theme-textMuted));
  font-size: 0.82rem;
}

h2,
h3 {
  margin: 0;
  color: rgb(var(--v-theme-textPrimary));
  line-height: 1.2;
}

h2 {
  font-size: 1.12rem;
}

h3 {
  font-size: 0.98rem;
}

.members-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 8px;
}

.members-list {
  padding: 0;
}

.member-date {
  color: rgb(var(--v-theme-textMuted));
  font-size: 0.76rem;
}

.member-url {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto auto;
  gap: 8px;
  align-items: center;
  margin-top: 6px;
  color: rgb(var(--v-theme-textMuted));
  font-size: 0.76rem;
}

.member-url span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
