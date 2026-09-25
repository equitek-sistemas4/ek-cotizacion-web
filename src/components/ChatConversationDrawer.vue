<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { getChatById, getChatMessages, searchChatsMessages, sendChatMessage } from '@/services/chats'
import { getChatMessagesWpp, sendWhatsappMessage } from '@/services/whatsapp'
import dialogAddMember from '@/components/dialogAddMember.vue'
import infoChatMembers from '@/components/infoChatMembers.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  chat: { type: Object, default: null },
  userId: { type: [Number, String], default: null },
  userName: { type: String, default: 'Usuario' },
  accessToken: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue', 'chat-deleted'])

const isOpen = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})
const conversationChat = ref(null)
const messages = ref([])
const loading = ref(false)
const error = ref('')
const message = ref('')
const selectedFile = ref(null)
const fileInput = ref(null)
const messageSending = ref(false)
const sendMessageError = ref('')
const messagesPanel = ref(null)
const chatSocket = ref(null)
const messageSearch = ref('')
const messageSearchVisible = ref(false)
const messageSearchLoading = ref(false)
const matchingMessageIds = ref(new Set())
const selectedMatchIndex = ref(-1)
const infoChatMembersKey = ref(0)
const infoChatMembersOpen = ref(false)
const messageElementRefs = new Map()

const activeChat = computed(() => conversationChat.value ?? props.chat)
const isWhatsapp = computed(() => activeChat.value?.channel === 'whatsapp')
const chatTitle = computed(() => {
  const chat = activeChat.value
  if (!chat) return 'Chat'
  return `${chat.name}${isWhatsapp.value ? '' : ` #${chat.quotation_id ?? ''}`}`
})
const matchingMessages = computed(() =>
  messages.value.filter((item) => matchingMessageIds.value.has(String(item.id))),
)
const activeMatchingMessageId = computed(() => matchingMessages.value[selectedMatchIndex.value]?.id ?? null)

const scrollMessagesToBottom = async () => {
  await nextTick()
  await new Promise((resolve) => requestAnimationFrame(resolve))
  if (messagesPanel.value) messagesPanel.value.scrollTop = messagesPanel.value.scrollHeight
}

const formatChatTime = (dateValue) => {
  if (!dateValue) return ''
  const numericValue = Number(dateValue)
  const date = Number.isFinite(numericValue) && String(dateValue).trim() !== ''
    ? new Date(numericValue < 100000000000 ? numericValue * 1000 : numericValue)
    : new Date(dateValue)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

const getAttachmentUrl = (file) => {
  const url = file?.url ?? file?.file_url ?? file?.download_url ?? file?.path ?? file?.location
  if (!url) return ''
  try {
    return new URL(url, import.meta.env.VITE_API_BASE_URL).toString()
  } catch {
    return url
  }
}

const normalizeFiles = (files) => {
  if (!files) return []
  const fileList = Array.isArray(files)
    ? files
    : files.url || files.file_url || files.download_url || files.path || files.location
      ? [files]
      : Object.values(files)
  return fileList.filter((file) => file && typeof file === 'object').map((file) => {
    const url = getAttachmentUrl(file)
    const type = file.type ?? file.mime_type ?? file.content_type ?? ''
    return {
      name: file.name ?? file.filename ?? file.file_name ?? 'Archivo adjunto',
      type,
      url,
      isImage: type.startsWith('image/') || /\.(avif|gif|jpe?g|png|svg|webp)$/i.test(url),
    }
  })
}

const normalizeMessage = (messageItem) => {
  const messageData = messageItem.message ?? messageItem ?? {}
  const sender = messageItem.sender ?? {}
  const text = messageData.text?.body ?? messageData.text ?? messageData.body ?? messageData.message ?? ''
  const direction = String(messageData.direction ?? '').toLocaleLowerCase()
  const fromMe =
    direction === 'outgoing' ||
    (direction !== 'incoming' &&
      (messageData.sender_type === 'user' || sender.type === 'user' || messageData.from_me === true))

  return {
    id: messageData.id ?? messageData.message_id,
    text: typeof text === 'string' ? text : '',
    time: formatChatTime(messageData.created_at ?? messageData.timestamp),
    fromMe,
    senderName: getSenderName({ messageData, sender, fromMe }),
    files: normalizeFiles(messageData.files),
  }
}

const getMemberName = (senderId, senderType) => {
  if (senderId === null || senderId === undefined) return ''

  const member = (activeChat.value?.members ?? []).find((item) => {
    if (senderType === 'contact') return String(item.contact_id) === String(senderId)
    if (senderType === 'user') return String(item.user_id) === String(senderId)
    return String(item.contact_id) === String(senderId) || String(item.user_id) === String(senderId)
  })

  return member?.user?.name ?? member?.user?.display_name ?? member?.contact?.name ?? member?.contact?.display_name ?? member?.contact_name ?? ''
}

const getSenderName = ({ messageData, sender, fromMe }) => {
  const senderId = sender.id ?? sender.sender_id ?? messageData.sender_id
  const senderType = sender.type ?? messageData.sender_type

  return (
    sender.display_name ||
    sender.name ||
    messageData.sender_name ||
    getMemberName(senderId, senderType) ||
    (fromMe ? props.userName : activeChat.value?.name) ||
    'Sin nombre'
  )
}

const closeSocket = () => {
  if (chatSocket.value) {
    chatSocket.value.close()
    chatSocket.value = null
  }
}

const connectSocket = () => {
  closeSocket()
  const chat = activeChat.value
  if (!isOpen.value || !chat?.id || !props.accessToken || (isWhatsapp.value && !chat.phone_number)) return
  const baseUrl = new URL(import.meta.env.VITE_API_BASE_URL)
  baseUrl.protocol = baseUrl.protocol === 'https:' ? 'wss:' : 'ws:'
  baseUrl.pathname = isWhatsapp.value ? '/chats/whatsapp/ws' : `/chats/${chat.id}/ws`
  baseUrl.searchParams.set('token', props.accessToken)
  if (isWhatsapp.value) baseUrl.searchParams.set('phone_number', chat.phone_number)
  const socket = new WebSocket(baseUrl.toString())
  chatSocket.value = socket
  socket.onmessage = async (event) => {
    try {
      const payload = JSON.parse(event.data)
      console.debug('[WhatsApp WS] payload recibido:', payload)

      if (isWhatsapp.value) {
        if (payload?.type !== 'whatsapp_message' || !payload.data) return

        const item = normalizeMessage(payload.data)
        if (!item.id || messages.value.some((current) => String(current.id) === String(item.id))) return

        messages.value = [...messages.value, item]
        await scrollMessagesToBottom()
        return
      }

      const incoming = payload?.message ?? payload?.data?.message ?? payload
      const item = normalizeMessage(incoming)
      if (!item.id || messages.value.some((current) => String(current.id) === String(item.id))) return

      messages.value = [...messages.value, item]
      await scrollMessagesToBottom()
    } catch (requestError) {
      console.error('[Chat WS] frame inválido:', requestError)
    }
  }
  socket.onclose = () => {
    if (chatSocket.value === socket) chatSocket.value = null
  }
}

const loadConversation = async () => {
  const chat = props.chat
  if (!chat?.id) return
  loading.value = true
  error.value = ''
  messages.value = []
  try {
    const messagesData = chat.channel === 'whatsapp'
      ? await getChatMessagesWpp({ accessToken: props.accessToken, phone_number: chat.phone_number })
      : await getChatMessages(chat.id)
    const detail = chat.channel === 'whatsapp' ? chat : await getChatById(chat.id)
    conversationChat.value = { ...chat, ...detail }
    const list = Array.isArray(messagesData) ? messagesData : messagesData?.messages ?? []
    messages.value = list.map(normalizeMessage)
    // El panel muestra el estado de carga mientras se obtiene la conversación;
    // quitarlo primero garantiza que los mensajes ya estén renderizados al medir
    // su altura para posicionar el scroll al final.
    loading.value = false
    await scrollMessagesToBottom()
    connectSocket()
  } catch (requestError) {
    error.value = requestError.message || 'Ocurrió un error al cargar los mensajes.'
  } finally {
    loading.value = false
  }
}

const setMessageElement = (messageId, element) => {
  if (element) messageElementRefs.set(String(messageId), element)
  else messageElementRefs.delete(String(messageId))
}

const scrollToSelectedMatch = async () => {
  await nextTick()
  messageElementRefs.get(String(activeMatchingMessageId.value))?.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

const searchMessages = async () => {
  const query = messageSearch.value.trim()
  if (!query || !props.chat?.id) {
    matchingMessageIds.value = new Set()
    selectedMatchIndex.value = -1
    return
  }
  messageSearchLoading.value = true
  try {
    const results = await searchChatsMessages(props.chat.id, { search: query })
    const list = Array.isArray(results) ? results : results?.messages ?? []
    matchingMessageIds.value = new Set(list.map((item) => item?.id ?? item?.message?.id).filter(Boolean).map(String))
    selectedMatchIndex.value = matchingMessages.value.length ? 0 : -1
    await scrollToSelectedMatch()
  } finally {
    messageSearchLoading.value = false
  }
}

const toggleSearch = () => {
  messageSearchVisible.value = !messageSearchVisible.value
  if (!messageSearchVisible.value) {
    messageSearch.value = ''
    matchingMessageIds.value = new Set()
    selectedMatchIndex.value = -1
  }
}

const moveToMatch = async (direction) => {
  const total = matchingMessages.value.length
  if (!total) return
  selectedMatchIndex.value = (selectedMatchIndex.value + direction + total) % total
  await scrollToSelectedMatch()
}

const isAllowedAttachment = (file) => file?.type === 'application/pdf' || file?.type?.startsWith('image/')
const selectAttachment = (event) => {
  const [file] = event.target.files ?? []
  if (!file) return
  if (!isAllowedAttachment(file)) {
    sendMessageError.value = 'Solo puedes adjuntar archivos PDF o imágenes.'
    event.target.value = ''
    return
  }
  selectedFile.value = file
}
const clearAttachment = () => {
  selectedFile.value = null
  if (fileInput.value) fileInput.value.value = ''
}

const sendMessage = async () => {
  const text = message.value.trim()
  const chat = activeChat.value
  if ((!text && !selectedFile.value) || messageSending.value || !chat) return
  messageSending.value = true
  sendMessageError.value = ''
  try {
    if (isWhatsapp.value) {
      if (selectedFile.value) throw new Error('El envío de archivos por WhatsApp aún no está disponible.')
      await sendWhatsappMessage({ to: chat.phone_number, text })
      await loadConversation()
    } else {
      await sendChatMessage({ chat_id: chat.id, sender_id: props.userId, sender_type: 'user', text, file: selectedFile.value })
    }
    message.value = ''
    clearAttachment()
  } catch (requestError) {
    sendMessageError.value = requestError.message || 'No se pudo enviar el mensaje.'
  } finally {
    messageSending.value = false
  }
}

const refreshConversation = async () => {
  await loadConversation()
  infoChatMembersKey.value += 1
}

watch(() => [isOpen.value, props.chat?.id], async ([open]) => {
  if (open) await loadConversation()
  else closeSocket()
}, { immediate: true })
onBeforeUnmount(closeSocket)
</script>

<template>
  <v-btn
    v-if="chat && !isOpen"
    class="info-chat-fab"
    color="primary"
    size="large"
    @click="infoChatMembersOpen = true"
  >
    <span class="info-chat-fab__label">información del chat</span>
    <v-icon icon="mdi-information-outline" />
  </v-btn>

  <v-btn
    v-if="chat && !isOpen"
    class="chat-fab"
    color="secondary"
    append-icon="mdi-message-text"
    size="large"
    @click="isOpen = true"
  >
    Chat
  </v-btn>

  <info-chat-members
    v-if="activeChat?.id"
    v-model="infoChatMembersOpen"
    :key="`info-chat-members-${activeChat.id}`"
    :chat-id="activeChat.id"
    :access-token="props.accessToken"
    :show-activator="false"
    @chat-deleted="emit('chat-deleted')"
  />

  <v-navigation-drawer v-model="isOpen" class="chat-drawer" location="right" temporary width="800">
    <section class="chat-content">
      <header class="conversation-header">
        <div class="conversation-user">
          <v-avatar :color="isWhatsapp ? 'success' : 'primary'" size="44">
            <v-icon v-if="isWhatsapp" icon="mdi-whatsapp" />
            <span v-else class="avatar-text">{{ activeChat?.name?.charAt(0) }}</span>
          </v-avatar>
          <div>
            <h2>{{ chatTitle }}</h2>
            <p>{{ activeChat?.description }}</p>
          </div>
        </div>
        <div v-if="!isWhatsapp" class="conversation-actions">
          <v-text-field v-if="messageSearchVisible" v-model="messageSearch" class="message-search" clearable density="compact" hide-details :loading="messageSearchLoading" placeholder="Buscar mensaje" prepend-inner-icon="mdi-magnify" variant="outlined" @update:model-value="searchMessages" />
          <v-btn v-if="messageSearchVisible" icon="mdi-chevron-up" size="small" variant="text" :disabled="!matchingMessages.length" @click="moveToMatch(-1)" />
          <v-btn v-if="messageSearchVisible" icon="mdi-chevron-down" size="small" variant="text" :disabled="!matchingMessages.length" @click="moveToMatch(1)" />
          <v-btn :icon="messageSearchVisible ? 'mdi-close' : 'mdi-magnify'" size="small" title="Buscar mensajes" variant="text" @click="toggleSearch" />
          <dialogAddMember :chat-id="activeChat?.id" :quotation-id="activeChat?.quotation_id" @member-added="refreshConversation" />
          <infoChatMembers :key="infoChatMembersKey" :chat-id="activeChat?.id" @chat-deleted="emit('chat-deleted')" />
        </div>
        <v-btn aria-label="Cerrar chat" icon="mdi-close" size="small" variant="text" @click="isOpen = false" />
      </header>

      <div ref="messagesPanel" class="messages-panel">
        <div v-if="loading" class="chat-state">
          <v-progress-circular color="primary" indeterminate size="30" />
          <span>Cargando mensajes...</span>
        </div>
        <div v-else-if="error" class="chat-state chat-state-error">
          <v-icon color="error" icon="mdi-alert-circle-outline" size="34" />
          <span>{{ error }}</span>
        </div>
        <div v-else-if="!messages.length" class="chat-state">
          <v-icon color="primary" icon="mdi-message-text-outline" size="34" />
          <span>No hay mensajes en esta conversación.</span>
        </div>
        <template v-else>
          <div v-for="item in messages" :key="item.id" :ref="(element) => setMessageElement(item.id, element)" class="message-row" :class="{ 'message-row-sent': item.fromMe, 'message-row-search-match': matchingMessageIds.has(String(item.id)), 'message-row-search-active': String(item.id) === String(activeMatchingMessageId) }">
            <div class="message-bubble">
              <small>{{ item.senderName }}</small>
              <p>{{ item.text }}</p>
              <div v-if="item.files.length" class="message-attachments">
                <div v-for="file in item.files" :key="`${file.name}-${file.url}`" class="message-attachment">
                  <img v-if="file.isImage && file.url" :alt="file.name" class="attachment-image-preview" :src="file.url" />
                  <v-icon v-else color="error" icon="mdi-file-pdf-box" size="42" />
                  <v-btn :disabled="!file.url" :download="file.name" :href="file.url || undefined" icon="mdi-download" size="small" target="_blank" variant="text" />
                </div>
              </div>
              <span>{{ item.time }}</span>
            </div>
          </div>
        </template>
      </div>

      <v-form class="message-composer" @submit.prevent="sendMessage">
        <span v-if="sendMessageError" class="send-message-error">{{ sendMessageError }}</span>
        <div v-if="selectedFile" class="attachment-preview"><v-icon :icon="selectedFile.type === 'application/pdf' ? 'mdi-file-pdf-box' : 'mdi-file-image-outline'" /><span>{{ selectedFile.name }}</span><v-btn icon="mdi-close" size="small" variant="text" @click="clearAttachment" /></div>
        <input ref="fileInput" accept="application/pdf,image/*" class="attachment-input" :disabled="messageSending" type="file" @change="selectAttachment" />
        <v-btn icon="mdi-paperclip" :disabled="messageSending" size="large" variant="text" @click="fileInput?.click()" />
        <v-text-field v-model="message" autocomplete="off" density="comfortable" :disabled="messageSending" hide-details placeholder="Escribe un mensaje" prepend-inner-icon="mdi-message-outline" variant="outlined" />
        <v-btn color="primary" icon="mdi-send" :loading="messageSending" size="large" type="submit" />
      </v-form>
    </section>
  </v-navigation-drawer>
</template>

<style scoped>
.chat-fab { background: rgb(var(--v-theme-secondary)) !important; color: rgb(var(--v-theme-surface)) !important; position: fixed; right: 24px; bottom: 24px; z-index: 20; }
.info-chat-fab {
  position: fixed;
  right: 24px;
  bottom: 92px;
  z-index: 21;
  overflow: hidden;
  min-width: 56px;
  max-width: 56px;
  transition: max-width 0.25s ease, min-width 0.25s ease, padding 0.25s ease;
}
.info-chat-fab:hover {
  min-width: 220px;
  max-width: 220px;
}
.info-chat-fab :deep(.v-btn__content) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  white-space: nowrap;
}
.info-chat-fab__label {
  display: inline-block;
  max-width: 0;
  overflow: hidden;
  opacity: 0;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  transition: max-width 0.25s ease, opacity 0.2s ease, margin 0.2s ease;
}
.info-chat-fab:hover .info-chat-fab__label {
  max-width: 170px;
  opacity: 1;
  margin-right: 4px;
}
.chat-drawer { width: min(100vw, 800px) !important; }
.chat-drawer :deep(.v-navigation-drawer__content) { height: 100%; }
.chat-content { display: grid; grid-template-rows: auto minmax(0, 1fr) auto; width: 100%; height: 100%; overflow: hidden; background: rgb(var(--v-theme-surface)); }
.conversation-header, .conversation-user, .conversation-actions, .message-composer { display: flex; align-items: center; }
.conversation-header { justify-content: space-between; gap: 8px; padding: 14px 16px; border-bottom: 1px solid rgb(var(--v-theme-border)); }
.conversation-user { min-width: 0; gap: 10px; }
.conversation-user > div { min-width: 0; }
.conversation-user h2, .conversation-user p { overflow: hidden; margin: 0; text-overflow: ellipsis; white-space: nowrap; }
.conversation-user h2 { color: rgb(var(--v-theme-textPrimary)); font-size: 1rem; }
.conversation-user p { margin-top: 3px; color: rgb(var(--v-theme-textMuted)); font-size: .82rem; }
.avatar-text { color: rgb(var(--v-theme-surface)); font-weight: 700; }
.conversation-actions { gap: 2px; }
.message-search { width: 170px; }
.messages-panel { display: flex; flex-direction: column; gap: 12px; overflow-y: auto; padding: 20px; background: linear-gradient(135deg, rgb(var(--v-theme-primary) / 8%), transparent 34%), rgb(var(--v-theme-background)); }
.chat-state { display: grid; flex: 1; place-items: center; gap: 10px; min-height: 220px; color: rgb(var(--v-theme-textMuted)); text-align: center; }
.chat-state-error, .send-message-error { color: rgb(var(--v-theme-error)); }
.message-row { display: flex; justify-content: flex-start; }
.message-row-sent { justify-content: flex-end; }
.message-bubble { max-width: 78%; padding: 10px 12px; border: 1px solid rgb(var(--v-theme-border)); border-radius: 8px; overflow-wrap: anywhere; }
.message-row-sent .message-bubble { border-color: rgb(var(--v-theme-primary)); background: rgb(var(--v-theme-primary)); color: rgb(var(--v-theme-surface)); }
.message-bubble p { margin: 4px 0; }
.message-bubble small, .message-bubble > span { display: block; font-size: .74rem; opacity: .75; }
.message-bubble > span { text-align: right; }
.message-row-search-match .message-bubble { box-shadow: 0 0 0 2px rgb(var(--v-theme-warning)); }
.message-row-search-active .message-bubble { box-shadow: 0 0 0 3px orangered; }
.message-attachments { display: grid; gap: 8px; margin-top: 8px; }
.message-attachment { display: flex; align-items: center; gap: 8px; padding: 6px; border-radius: 6px; background: rgb(var(--v-theme-surface) / 15%); }
.attachment-image-preview { width: 64px; height: 64px; object-fit: cover; }
.message-composer { position: relative; flex-wrap: wrap; gap: 8px; padding: 12px 16px; border-top: 1px solid rgb(var(--v-theme-border)); }
.message-composer :deep(.v-input) { flex: 1; min-width: 0; }
.attachment-input { display: none; }
.attachment-preview, .send-message-error { display: flex; flex: 0 0 100%; align-items: center; gap: 6px; }
.attachment-preview span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
@media (max-width: 600px) { .chat-fab { right: 16px; bottom: 16px; } .info-chat-fab { right: 16px; bottom: 84px; } .conversation-header { padding: 10px; } .message-search { width: 130px; } .messages-panel { padding: 12px; } }
</style>
