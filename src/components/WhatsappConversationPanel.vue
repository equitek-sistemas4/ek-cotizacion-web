<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { getChatMessagesWpp, sendWhatsappMessage } from '@/services/whatsapp'
import { searchChatsMessagesWpp } from '@/services/chats'

const props = defineProps({
  chat: { type: Object, default: null },
  accessToken: { type: String, default: '' },
  userName: { type: String, default: 'Usuario' },
})

const messages = ref([])
const loading = ref(false)
const error = ref('')
const draft = ref('')
const sending = ref(false)
const sendError = ref('')
const messagesPanel = ref(null)
const socket = ref(null)
const messageSearch = ref('')
const messageSearchVisible = ref(false)
const messageSearchLoading = ref(false)
const matchingMessageIds = ref(new Set())
const selectedMatchIndex = ref(-1)
const messageElementRefs = new Map()

const matchingMessages = computed(() => messages.value.filter((message) => matchingMessageIds.value.has(String(message.id))))
const activeMatchingMessageId = computed(() => matchingMessages.value[selectedMatchIndex.value]?.id ?? null)

const formatTime = (value) => {
  if (!value) return ''
  const numeric = Number(value)
  const date = Number.isFinite(numeric) && String(value).trim() !== '' ? new Date(numeric < 100000000000 ? numeric * 1000 : numeric) : new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })
}

const normalizeMessage = (item) => {
  const data = item?.message ?? item ?? {}
  const sender = item?.sender ?? {}
  const direction = String(data.direction ?? '').toLocaleLowerCase()
  const fromMe = direction === 'outgoing' || (direction !== 'incoming' && (data.from_me === true || data.sender_type === 'user' || sender.type === 'user'))
  return {
    id: data.id ?? data.message_id,
    text: data.text?.body ?? data.text ?? data.body ?? data.message ?? '',
    time: formatTime(data.created_at ?? data.timestamp),
    fromMe,
    senderName: sender.display_name ?? sender.name ?? data.sender_name ?? (fromMe ? props.userName : props.chat?.name ?? 'WhatsApp'),
  }
}

const scrollToBottom = async () => {
  await nextTick()
  await new Promise((resolve) => requestAnimationFrame(resolve))
  if (messagesPanel.value) messagesPanel.value.scrollTop = messagesPanel.value.scrollHeight
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
  if (!query || !props.chat?.phone_number) {
    matchingMessageIds.value = new Set()
    selectedMatchIndex.value = -1
    return
  }
  messageSearchLoading.value = true
  try {
    const results = await searchChatsMessagesWpp({ phone_number: props.chat.phone_number, search: query, accessToken: props.accessToken })
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

const closeSocket = () => {
  socket.value?.close()
  socket.value = null
}

const connectSocket = () => {
  closeSocket()
  if (!props.chat?.phone_number || !props.accessToken) return
  const url = new URL(import.meta.env.VITE_API_BASE_URL)
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:'
  url.pathname = '/chats/whatsapp/ws'
  url.searchParams.set('token', props.accessToken)
  url.searchParams.set('phone_number', props.chat.phone_number)
  const chatSocket = new WebSocket(url.toString())
  socket.value = chatSocket
  chatSocket.onmessage = async (event) => {
    try {
      const payload = JSON.parse(event.data)
      console.debug('[WhatsApp WS] payload recibido:', payload)

      if (payload?.type !== 'whatsapp_message' || !payload.data) return

      const message = normalizeMessage(payload.data)
      if (!message.id || messages.value.some((current) => String(current.id) === String(message.id))) return

      messages.value = [...messages.value, message]
      await scrollToBottom()
    } catch (requestError) {
      console.error('[WhatsApp WS] frame inválido:', requestError)
    }
  }
  chatSocket.onclose = () => {
    if (socket.value === chatSocket) socket.value = null
  }
}

const loadConversation = async () => {
  if (!props.chat?.phone_number) return
  loading.value = true
  error.value = ''
  messages.value = []
  matchingMessageIds.value = new Set()
  selectedMatchIndex.value = -1
  try {
    const data = await getChatMessagesWpp({ accessToken: props.accessToken, phone_number: props.chat.phone_number })
    messages.value = (Array.isArray(data) ? data : data?.messages ?? []).map(normalizeMessage)
    loading.value = false
    await scrollToBottom()
    connectSocket()
  } catch (requestError) {
    error.value = requestError.message || 'No se pudieron cargar los mensajes.'
  } finally {
    loading.value = false
  }
}

const sendMessage = async () => {
  const text = draft.value.trim()
  if (!text || sending.value || !props.chat?.phone_number) return
  sending.value = true
  sendError.value = ''
  try {
    await sendWhatsappMessage({ to: props.chat.phone_number, text })
    draft.value = ''
    await loadConversation()
  } catch (requestError) {
    sendError.value = requestError.message || 'No se pudo enviar el mensaje.'
  } finally {
    sending.value = false
  }
}

watch(() => props.chat?.id, loadConversation, { immediate: true })
onBeforeUnmount(closeSocket)
</script>

<template>
  <section class="whatsapp-conversation">
    <header class="conversation-header">
      <div class="conversation-user">
        <v-avatar color="success" size="44">
          <v-icon icon="mdi-whatsapp" />
        </v-avatar>
        <div>
          <h2>{{ chat?.name || 'WhatsApp' }}</h2>
          <p>{{ chat?.description }}</p>
        </div>
      </div>
      <div class="conversation-actions">
        <v-text-field v-if="messageSearchVisible" v-model="messageSearch" class="message-search" clearable density="compact" hide-details :loading="messageSearchLoading" placeholder="Buscar mensaje" prepend-inner-icon="mdi-magnify" variant="outlined" @update:model-value="searchMessages" />
        <v-btn v-if="messageSearchVisible" icon="mdi-chevron-up" size="small" variant="text" :disabled="!matchingMessages.length" @click="moveToMatch(-1)" />
        <v-btn v-if="messageSearchVisible" icon="mdi-chevron-down" size="small" variant="text" :disabled="!matchingMessages.length" @click="moveToMatch(1)" />
        <v-btn :icon="messageSearchVisible ? 'mdi-close' : 'mdi-magnify'" size="small" title="Buscar mensajes" variant="text" @click="toggleSearch" />
      </div>
    </header>
    <div ref="messagesPanel" class="messages-panel">
      <div v-if="loading" class="chat-state">
        <v-progress-circular color="success" indeterminate size="30" />
        <span>Cargando mensajes...</span>
      </div>
      <div v-else-if="error" class="chat-state chat-state-error">
        <v-icon color="error" icon="mdi-alert-circle-outline" size="34" />
        <span>{{ error }}</span>
      </div>
      <div v-else-if="!messages.length" class="chat-state">
        <v-icon color="success" icon="mdi-message-text-outline" size="34" />
        <span>No hay mensajes en esta conversación.</span>
      </div>
      <template v-else>
        <div v-for="item in messages" :key="item.id" :ref="(element) => setMessageElement(item.id, element)" class="message-row" :class="{ 'message-row-sent': item.fromMe, 'message-row-search-match': matchingMessageIds.has(String(item.id)), 'message-row-search-active': String(item.id) === String(activeMatchingMessageId) }">
          <div class="message-bubble">
            <small>{{ item.senderName }}</small>
            <p>{{ item.text }}</p>
            <span>{{ item.time }}</span>
          </div>
        </div>
      </template>
    </div>
    <v-form class="message-composer" @submit.prevent="sendMessage">
      <span v-if="sendError" class="send-error">{{ sendError }}</span>
      <v-text-field v-model="draft" autocomplete="off" density="comfortable" :disabled="sending" hide-details placeholder="Escribe un mensaje" prepend-inner-icon="mdi-message-outline" variant="outlined" />
      <v-btn color="success" icon="mdi-send" :loading="sending" size="large" type="submit" />
    </v-form>
  </section>
</template>

<style scoped>
.whatsapp-conversation { 
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: rgb(var(--v-theme-surface));
}
.conversation-header, .conversation-user, .conversation-actions, .message-composer { 
  display: flex;
  align-items: center;
}
.conversation-header { 
  justify-content: space-between;
  gap: 10px;
  padding: 14px 16px;
  border-bottom: 1px solid rgb(var(--v-theme-border));
}
.conversation-user { min-width: 0; gap: 10px; }.conversation-user > div { min-width: 0; }.conversation-actions { gap: 2px; }.message-search { width: 170px; }
.conversation-header h2, .conversation-header p { 
  overflow: hidden;
  margin: 0;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.conversation-header h2 { 
  color: rgb(var(--v-theme-textPrimary));
  font-size: 1rem;
}.conversation-header p { 
  margin-top: 3px; color: rgb(var(--v-theme-textMuted));
  font-size: .82rem;
}.messages-panel { 
  display: flex;
  flex-direction: column;
  gap: 12px;
  overflow-y: auto;
  padding: 20px;
  background: linear-gradient(135deg, rgb(var(--v-theme-success) / 8%), transparent 34%), rgb(var(--v-theme-background));
}
.chat-state { 
  display: grid; 
  flex: 1; 
  place-items: center; 
  gap: 10px; 
  min-height: 220px; 
  color: rgb(var(--v-theme-textMuted)); 
  text-align: center;
}
.chat-state-error, .send-error { 
  color: rgb(var(--v-theme-error)); 
}
.message-row { 
  display: flex; 
  justify-content: flex-start; 
}
.message-row-sent { 
  justify-content: flex-end; 
}
.message-row-search-match .message-bubble { box-shadow: 0 0 0 2px rgb(var(--v-theme-warning)); }.message-row-search-active .message-bubble { box-shadow: 0 0 0 3px orangered; }
.message-bubble { 
  max-width: 78%; 
  padding: 10px 12px; 
  border: 1px solid rgb(var(--v-theme-border)); 
  border-radius: 8px; 
  overflow-wrap: anywhere; 
}
.message-row-sent .message-bubble { 
  border-color: rgb(var(--v-theme-success)); 
  background: rgb(var(--v-theme-success)); 
  color: rgb(var(--v-theme-surface)); 
}
.message-bubble p { 
  margin: 4px 0; 
}
.message-bubble small, .message-bubble span { 
  display: block; 
  font-size: .74rem; 
  opacity: .75; 
}
.message-bubble span { 
  text-align: right; 
}
.message-composer { 
  position: relative; 
  gap: 8px; 
  padding: 12px 16px; 
  border-top: 1px solid rgb(var(--v-theme-border)); 
}
.message-composer :deep(.v-input) { 
  flex: 1; 
  min-width: 0; 
}
.send-error { 
  position: absolute; 
  top: -22px; 
  left: 16px; 
  font-size: .8rem; 
}
</style>
