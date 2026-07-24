<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  getChatById,
  getChatMessages,
  sendChatMessage,
  getChatMemberByCode,
} from '@/services/chats'
import infoClientQuotation from '@/components/infoClientQuotation.vue'

const route = useRoute()

const access_code = computed(() => route.params.access_code)

const chatId = ref(null)
const contactId = ref(null)
const token = ref('')
const chat = ref(null)
const messages = ref([])
const message = ref('')
const selectedFile = ref(null)
const fileInput = ref(null)
const loading = ref(false)
const errorMessage = ref('')
const messageSending = ref(false)
const sendMessageError = ref('')
const messagesPanel = ref(null)
const chatSocket = ref(null)
const chatOpen = ref(false)
const quotationId = ref(null)
let reconnectTimer = null

const chatTitle = computed(() => chat.value?.name || 'Chat')

const contactName = computed(() => {
  const members = chat.value?.members ?? []
  const member = members.find((item) => String(item.contact_id) === String(contactId.value))

  return (
    member?.contact?.name || member?.contact_name || member?.contact?.display_name || 'Contacto'
  )
})

/*const getQuotationId = (...sources) => {
  for (const source of sources) {
    const quotation = source?.quotation ?? source?.cotizacion
    const id =
      source?.quotation_id ??
      source?.quotationId ??
      source?.quote_id ??
      source?.idcoti ??
      quotation?.idcoti ??
      quotation?.id

    if (id !== null && id !== undefined) {
      return id
    }
  }

  return null
}*/

const scrollMessagesToBottom = async () => {
  await nextTick()
  await new Promise((resolve) => requestAnimationFrame(resolve))

  if (messagesPanel.value) {
    messagesPanel.value.scrollTop = messagesPanel.value.scrollHeight
  }
}

const formatChatTime = (dateValue) => {
  if (!dateValue) {
    return ''
  }

  const date = new Date(dateValue)

  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return date.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

const getAttachmentUrl = (file) => {
  const fileUrl = file?.url ?? file?.file_url ?? file?.download_url ?? file?.path ?? file?.location

  if (!fileUrl) {
    return ''
  }

  try {
    return new URL(fileUrl, import.meta.env.VITE_API_BASE_URL).toString()
  } catch {
    return fileUrl
  }
}

const normalizeFiles = (files) => {
  if (!files) {
    return []
  }

  const fileList = Array.isArray(files)
    ? files
    : files.url || files.file_url || files.download_url || files.path || files.location
      ? [files]
      : Object.values(files)

  return fileList
    .filter((file) => file && typeof file === 'object')
    .map((file) => {
      const url = getAttachmentUrl(file)
      const name = file.name ?? file.filename ?? file.file_name ?? 'Archivo adjunto'
      const type = file.type ?? file.mime_type ?? file.content_type ?? ''

      return {
        name,
        type,
        url,
        isImage: type.startsWith('image/') || /\.(avif|gif|jpe?g|png|svg|webp)$/i.test(url),
      }
    })
}

const normalizeMessage = (messageItem) => {
  const messageWrapper = messageItem?.message && messageItem?.sender ? messageItem : null
  const messageData = messageWrapper?.message ?? messageItem?.message ?? messageItem ?? {}
  const sender = messageWrapper?.sender ?? messageItem?.sender ?? {}
  const isOwnMessage =
    (sender.type === 'contact' && String(sender.id) === String(contactId.value)) ||
    (messageData.sender_type === 'contact' &&
      String(messageData.sender_id) === String(contactId.value))

  return {
    id: messageData.id,
    text: messageData.text,
    time: formatChatTime(messageData.created_at),
    fromMe: isOwnMessage,
    senderName: sender.display_name || 'Sin nombre',
    sender,
    files: normalizeFiles(messageData.files),
  }
}

const getChatWebSocketUrl = () => {
  const baseUrl = new URL(import.meta.env.VITE_API_BASE_URL)
  baseUrl.protocol = baseUrl.protocol === 'https:' ? 'wss:' : 'ws:'
  baseUrl.pathname = `/chats/${chatId.value}/ws`
  baseUrl.search = ''

  if (token.value) {
    baseUrl.searchParams.set('token', token.value)
  }

  return baseUrl.toString()
}

const getIncomingMessagePayload = (eventData) => {
  const payload = eventData?.data ?? eventData
  const messagePayload = Array.isArray(payload) ? payload[0] : payload

  if (messagePayload?.message) {
    return {
      ...messagePayload,
      sender: messagePayload.sender ?? {},
    }
  }

  if (messagePayload?.id && messagePayload?.text) {
    return {
      message: messagePayload,
      sender: messagePayload.sender ?? {},
    }
  }

  return null
}

const appendIncomingMessage = async (activeChatId, messageItem) => {
  if (String(activeChatId) !== String(chatId.value)) {
    return
  }

  if (!messageItem) {
    return
  }

  const newMessage = normalizeMessage(messageItem)
  const alreadyExists = messages.value.some(
    (item) => newMessage.id && String(item.id) === String(newMessage.id),
  )

  if (alreadyExists) {
    return
  }

  messages.value.push(newMessage)
  await scrollMessagesToBottom()
}

const clearReconnectTimer = () => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer)
    reconnectTimer = null
  }
}

const closeChatWebSocket = () => {
  if (chatSocket.value) {
    chatSocket.value.__manuallyClosed = true
    chatSocket.value.close()
    chatSocket.value = null
  }

  clearReconnectTimer()
}

const connectChatWebSocket = () => {
  clearReconnectTimer()
  closeChatWebSocket()

  if (!chatId.value || !token.value) {
    return
  }

  const socket = new WebSocket(getChatWebSocketUrl())
  socket.__manuallyClosed = false
  chatSocket.value = socket

  socket.onopen = () => {
    clearReconnectTimer()
  }

  socket.onmessage = (event) => {
    try {
      const eventData = typeof event.data === 'string' ? JSON.parse(event.data) : event.data
      appendIncomingMessage(chatId.value, getIncomingMessagePayload(eventData))
    } catch {
      appendIncomingMessage(chatId.value, getIncomingMessagePayload(event.data))
    }
  }

  socket.onerror = () => {
    errorMessage.value = 'Se perdio la conexion en tiempo real del chat.'
  }

  socket.onclose = () => {
    if (chatSocket.value === socket && !socket.__manuallyClosed) {
      chatSocket.value = null
      reconnectTimer = window.setTimeout(() => {
        connectChatWebSocket()
      }, 1200)
    }
  }
}

const loadChat = async () => {
  loading.value = true
  errorMessage.value = ''
  let shouldScrollToBottom = false

  try {
    const chatMember = await getChatMemberByCode(access_code.value)
    chatId.value = chatMember?.chat_id ?? null
    contactId.value = chatMember?.contact_id ?? null
    token.value = chatMember?.token ?? null
    quotationId.value = chatMember?.quotation_id ?? null

    const [chatDetail, messagesData] = await Promise.all([
      getChatById(chatId.value, { accessToken: token.value }),
      getChatMessages(chatId.value, { accessToken: token.value }),
    ])

    chat.value = chatDetail
    messages.value = Array.isArray(messagesData?.messages)
      ? messagesData.messages.map(normalizeMessage)
      : []
    if (chatOpen.value) {
      connectChatWebSocket()
    }
    shouldScrollToBottom = true
  } catch (error) {
    errorMessage.value = error.message || 'Ocurrio un error al cargar el chat.'
  } finally {
    loading.value = false

    if (shouldScrollToBottom) {
      await scrollMessagesToBottom()
    }
  }
}

const isAllowedAttachment = (file) =>
  file?.type === 'application/pdf' || file?.type?.startsWith('image/')

const selectAttachment = (event) => {
  const [file] = event.target.files ?? []

  if (!file) {
    return
  }

  if (!isAllowedAttachment(file)) {
    sendMessageError.value = 'Solo puedes adjuntar archivos PDF o imágenes.'
    event.target.value = ''
    return
  }

  selectedFile.value = file
  sendMessageError.value = ''
}

const clearAttachment = () => {
  selectedFile.value = null

  if (fileInput.value) {
    fileInput.value.value = ''
  }
}

const sendMessage = async () => {
  const text = message.value.trim()

  if ((!text && !selectedFile.value) || messageSending.value) {
    return
  }

  messageSending.value = true
  sendMessageError.value = ''

  try {
    await sendChatMessage({
      chat_id: chatId.value,
      sender_id: contactId.value,
      sender_type: 'contact',
      text,
      file: selectedFile.value,
      accessToken: token.value,
    })

    message.value = ''
    clearAttachment()
  } catch (error) {
    sendMessageError.value = error.message || 'No se pudo enviar el mensaje.'
  } finally {
    messageSending.value = false
  }
}

onMounted(() => {
  loadChat()
})

watch(chatOpen, (isOpen) => {
  if (isOpen) {
    connectChatWebSocket()
    scrollMessagesToBottom()
    return
  }

  closeChatWebSocket()
})

onBeforeUnmount(() => {
  closeChatWebSocket()
})
</script>

<template>
  <v-container class="contact-chat-view" fluid>
    <info-client-quotation
      v-if="token"
      :chat-title="chatTitle"
      :contact-name="contactName"
      :error-message="errorMessage"
      :loading="loading"
      :quotation-id="quotationId"
      :access-token="token"
    />

    <v-btn
      aria-label="Abrir chat"
      class="chat-fab"
      color="primary"
      append-icon="mdi-message-text"
      size="large"
      @click="chatOpen = true"
    >Chat</v-btn>

    <v-navigation-drawer
      v-model="chatOpen"
      class="chat-drawer"
      location="right"
      temporary
      width="560"
    >
      <section class="chat-content">
        <header class="conversation-header">
          <div class="conversation-user">
            <v-avatar color="primary" size="44">
              <span class="avatar-text">{{ contactName.charAt(0) }}</span>
            </v-avatar>

            <div>
              <h1>{{ chatTitle }}</h1>
              <p>{{ contactName }}</p>
            </div>
          </div>

          <v-btn
            aria-label="Cerrar chat"
            icon="mdi-close"
            size="small"
            variant="text"
            @click="chatOpen = false"
          />
        </header>

        <div ref="messagesPanel" class="messages-panel">
          <div v-if="loading" class="chat-state">
            <v-progress-circular color="primary" indeterminate size="30" />
            <span>Cargando chat...</span>
          </div>

          <div v-else-if="errorMessage" class="chat-state chat-state-error">
            <v-icon color="error" icon="mdi-alert-circle-outline" size="34" />
            <span>{{ errorMessage }}</span>
          </div>

          <div v-else-if="!messages.length" class="chat-state">
            <v-icon color="primary" icon="mdi-message-text-outline" size="34" />
            <span>No hay mensajes en esta conversacion.</span>
          </div>

          <template v-else>
            <div
              v-for="item in messages"
              :key="item.id"
              class="message-row"
              :class="{ 'message-row-sent': item.fromMe }"
            >
              <div class="message-bubble">
                <small>{{ item.senderName }}</small>
                <p>{{ item.text }}</p>
                <div v-if="item.files.length" class="message-attachments">
                  <div
                    v-for="file in item.files"
                    :key="`${file.name}-${file.url}`"
                    class="message-attachment"
                  >
                    <img
                      v-if="file.isImage && file.url"
                      :alt="file.name"
                      class="attachment-image-preview"
                      :src="file.url"
                    />
                    <v-icon v-else color="error" icon="mdi-file-pdf-box" size="42" />

                    <div class="attachment-details">
                      <!--<span>{{ file.name }}</span>-->
                      <v-btn
                        aria-label="Descargar archivo"
                        color="gray"
                        :disabled="!file.url"
                        :download="file.name"
                        :href="file.url || undefined"
                        icon="mdi-download"
                        size="small"
                        target="_blank"
                        variant="tonal"
                      >
                      </v-btn>
                    </div>
                  </div>
                </div>
                <span>{{ item.time }}</span>
              </div>
            </div>
          </template>
        </div>

        <v-form class="message-composer" @submit.prevent="sendMessage">
          <span v-if="sendMessageError" class="send-message-error">{{ sendMessageError }}</span>

          <div v-if="selectedFile" class="attachment-preview">
            <v-icon
              :icon="
                selectedFile.type === 'application/pdf'
                  ? 'mdi-file-pdf-box'
                  : 'mdi-file-image-outline'
              "
            />
            <span>{{ selectedFile.name }}</span>
            <v-btn
              aria-label="Quitar archivo adjunto"
              density="compact"
              icon="mdi-close"
              size="small"
              variant="text"
              @click="clearAttachment"
            />
          </div>

          <input
            ref="fileInput"
            accept="application/pdf,image/*"
            class="attachment-input"
            :disabled="messageSending"
            type="file"
            @change="selectAttachment"
          />

          <v-btn
            aria-label="Adjuntar archivo"
            color="primary"
            icon="mdi-paperclip"
            :disabled="messageSending"
            size="large"
            variant="text"
            @click="fileInput?.click()"
          />

          <v-text-field
            v-model="message"
            autocomplete="off"
            color="primary"
            density="comfortable"
            :disabled="messageSending"
            hide-details
            placeholder="Escribe un mensaje"
            prepend-inner-icon="mdi-message-outline"
            variant="outlined"
          />

          <v-btn
            color="primary"
            icon="mdi-send"
            :loading="messageSending"
            size="large"
            type="submit"
            variant="flat"
          />
        </v-form>
      </section>
    </v-navigation-drawer>
  </v-container>
</template>

<style scoped>
.contact-chat-view {
  width: 100%;
  min-height: 100vh;
  min-height: 100dvh;
  padding: 24px;
  background: rgb(var(--v-theme-appBackground));
}

.chat-fab {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 10;
}

.chat-drawer :deep(.v-navigation-drawer__content) {
  height: 100%;
}

.chat-drawer {
  width: min(100vw, 560px) !important;
}

.chat-content {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  width: 100%;
  height: 100%;
  min-width: 0;
  overflow: hidden;
  border: 1px solid rgb(var(--v-theme-border));
  border-radius: 8px;
  background: rgb(var(--v-theme-surface));
}

.conversation-header,
.conversation-user,
.message-composer {
  display: flex;
  align-items: center;
}

.conversation-header {
  justify-content: space-between;
  gap: 16px;
  padding: 18px 24px;
  border-bottom: 1px solid rgb(var(--v-theme-border));
}

.conversation-user {
  min-width: 0;
  gap: 12px;
}

.conversation-user > div {
  min-width: 0;
}

.avatar-text {
  color: rgb(var(--v-theme-surface));
  font-weight: 700;
}

.conversation-user h1 {
  overflow: hidden;
  margin: 0;
  color: rgb(var(--v-theme-textPrimary));
  font-size: 1.15rem;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conversation-user p {
  overflow: hidden;
  margin: 3px 0 0;
  color: rgb(var(--v-theme-textMuted));
  font-size: 0.86rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.messages-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  padding: 24px;
  background:
    linear-gradient(135deg, rgb(var(--v-theme-primary) / 8%), transparent 34%),
    rgb(var(--v-theme-background));
}

.chat-state {
  display: grid;
  flex: 1;
  place-items: center;
  gap: 10px;
  min-height: 220px;
  color: rgb(var(--v-theme-textMuted));
  font-size: 0.9rem;
  text-align: center;
}

.chat-state-error {
  color: rgb(var(--v-theme-error));
}

.message-row {
  display: flex;
  justify-content: flex-start;
}

.message-row-sent {
  justify-content: flex-end;
}

.message-bubble {
  max-width: min(70%, 560px);
  padding: 12px 14px;
  border: 1px solid rgb(var(--v-theme-border));
  border-radius: 8px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-textPrimary));
  overflow-wrap: anywhere;
}

.message-row-sent .message-bubble {
  border-color: rgb(var(--v-theme-primary));
  background: rgb(var(--v-theme-primary));
  color: rgb(var(--v-theme-surface));
}

.message-bubble p {
  margin: 4px 0 0;
}

.message-bubble small {
  display: block;
  opacity: 0.82;
  font-size: 0.72rem;
  font-weight: 700;
}

.message-bubble span {
  display: block;
  margin-top: 4px;
  opacity: 0.72;
  font-size: 0.76rem;
  text-align: right;
}

.message-attachments {
  display: grid;
  gap: 8px;
  margin-top: 10px;
}

.message-attachment {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 220px;
  padding: 8px;
  border-radius: 6px;
  background: rgb(var(--v-theme-surface) / 16%);
}

.attachment-image-preview {
  width: 74px;
  height: 74px;
  border-radius: 4px;
  object-fit: cover;
}

.attachment-details {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.attachment-details > span {
  margin: 0;
  overflow: hidden;
  font-size: 0.8rem;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.message-row:not(.message-row-sent) .message-attachment {
  background: rgb(var(--v-theme-primary) / 8%);
}

.message-composer {
  position: relative;
  flex-wrap: wrap;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid rgb(var(--v-theme-border));
}

.message-composer :deep(.v-input) {
  flex: 1 1 0;
  min-width: 0;
}

.message-composer :deep(.v-btn) {
  flex: 0 0 auto;
}

.attachment-input {
  display: none;
}

.attachment-preview {
  display: flex;
  flex: 0 0 100%;
  align-items: center;
  gap: 6px;
  min-width: 0;
  color: rgb(var(--v-theme-textMuted));
  font-size: 0.84rem;
}

.attachment-preview span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.attachment-preview :deep(.v-btn) {
  margin-left: auto;
}

.send-message-error {
  flex: 0 0 100%;
  color: rgb(var(--v-theme-error));
  font-size: 0.84rem;
}

@media (max-width: 700px) {
  .contact-chat-view {
    padding: 16px;
  }

  .chat-content {
    width: 100%;
    height: 100svh;
    height: 100dvh;
    border: 0;
    border-radius: 0;
  }

  .conversation-header {
    padding: calc(10px + env(safe-area-inset-top)) 12px 10px;
    gap: 8px;
  }

  .conversation-user {
    gap: 10px;
  }

  .conversation-user :deep(.v-avatar) {
    width: 38px !important;
    height: 38px !important;
    min-width: 38px !important;
  }

  .conversation-user h1 {
    font-size: 1rem;
  }

  .conversation-user p {
    font-size: 0.8rem;
  }

  .messages-panel {
    gap: 10px;
    padding: 14px 12px;
  }

  .message-bubble {
    max-width: 90%;
    padding: 10px 12px;
    font-size: 0.92rem;
  }

  .message-composer {
    flex-wrap: nowrap;
    gap: 8px;
    padding: 10px 12px calc(10px + env(safe-area-inset-bottom));
    background: rgb(var(--v-theme-surface));
  }

  .message-composer :deep(.v-btn) {
    width: 44px;
    height: 44px;
  }

  .attachment-preview {
    position: absolute;
    right: 12px;
    bottom: calc(64px + env(safe-area-inset-bottom));
    left: 12px;
    flex-basis: auto;
    padding: 6px 8px;
    border: 1px solid rgb(var(--v-theme-border));
    border-radius: 6px;
    background: rgb(var(--v-theme-surface));
  }
}

@media (max-width: 380px) {
  .conversation-header {
    padding-right: 8px;
    padding-left: 10px;
  }

  .messages-panel {
    padding-right: 10px;
    padding-left: 10px;
  }

  .message-bubble {
    max-width: 94%;
  }

  .message-composer {
    padding-right: 10px;
    padding-left: 10px;
  }
}
</style>
