<template>
  <div class="pa-4 text-center">
    <v-dialog
      v-model="dialog"
      max-width="600"
    >
      <template v-slot:activator="{ props: activatorProps }">
        <v-btn
          class="text-none font-weight-regular"
          icon="mdi-account-multiple-plus"
          variant="outlined"
          v-bind="activatorProps"
        ></v-btn>
      </template>

      <v-card
        prepend-icon="mdi-account-plus"
        title="Agregar Participante"
      >
        <v-card-text>
          <v-row density="comfortable">

            <v-col
              cols="12"
            >
              <v-select
                :items="contacts"
                item-title="name"
                item-value="id"
                v-model="contactId"
                label="Contactos"
                required
              ></v-select>
            </v-col>

          </v-row>

        </v-card-text>

        <v-divider></v-divider>

        <v-card-actions>
          <v-spacer></v-spacer>

          <v-btn
            color="secondary"
            text="Cerrar"
            variant="elevated"
            @click="dialog = false"
          ></v-btn>

          <v-btn
            color="primary"
            text="Agregar"
            variant="elevated"
            @click=addMemberToChat()
          ></v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup>
    import { shallowRef, ref, watch } from 'vue'
    import { addMember } from '@/services/chats'
    import { getContactsAvailableChat } from '@/services/contacts'

    const props = defineProps({
        chatId: {
            type: [Number, String],
            default: null,
        },
    })
    const emit = defineEmits(['member-added'])

    const dialog = shallowRef(false)
    const contacts = ref([])
    const contactsError = ref('')
    const addMemberError = ref('')
    const contactId = ref(null)

    const alertDialog = ref(false)
    const alertType = ref('success')
    const alertTitle = ref('')
    const alertMessage = ref('')

    const showAlert = ({ type, title, message }) => {
        alertType.value = type
        alertTitle.value = title
        alertMessage.value = message
        alertDialog.value = true
    }

    const clearForm = () => {
        contactId.value = null
    }

    const loadContactsAvailableChat = async (chat_id) => {
        contactsError.value = ''
        clearForm()

        if (!chat_id) {
            contacts.value = []
            return
        }

        try {
            const contactsList = await getContactsAvailableChat(chat_id)
            contacts.value = contactsList
        } catch (error) {
            contactsError.value = error.message || 'Ocurrio un error al cargar los contactos.'
            showAlert({
                type: 'error',
                title: 'No se cargaron los contactos',
                message: contactsError.value,
            })
        }
    }

    const addMemberToChat = async () => {
        addMemberError.value = ''

        try {
            await addMember({
                chat_id: props.chatId,
                contact_id: contactId.value,
            })
            showAlert({
                type: 'success',
                title: 'Participante agregado',
                message: 'El contacto se agrego correctamente al chat.',
            })
            emit('member-added', { chat_id: props.chatId })
            dialog.value = false
        } catch (error) {
            addMemberError.value = error.message || 'Ocurrio un error al agregar el contacto al chat'
            showAlert({
                type: 'error',
                title: 'No se cargaron los contactos',
                message: addMemberError.value,
            })
        }
    }

    watch(() => props.chatId, loadContactsAvailableChat, { immediate: true })

    watch(dialog, (isOpen) => {
        if (!isOpen) {
            clearForm()
        }
    })

</script>
