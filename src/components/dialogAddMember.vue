<template>
  <div class="pa-4 text-center">
    <MessageAlertDialog
      v-model="alertDialog"
      :message="alertMessage"
      :title="alertTitle"
      :type="alertType"
    />

    <v-dialog v-model="dialog" max-width="600">
      <template v-if="showActivator" v-slot:activator="{ props: activatorProps }">
        <v-btn
          class="text-none font-weight-regular"
          icon="mdi-account-multiple-plus"
          variant="outlined"
          v-bind="activatorProps"
        ></v-btn>
      </template>

      <v-card
        prepend-icon="mdi-account-plus"
        title="Agregar Nuevo Participante al Chat"
      >
        <v-card-text>
          <v-row density="comfortable">

            <v-col
              cols="12"
            >
              <v-autocomplete
                autocomplete="off"
                v-model="contactId"
                :disabled="isUpdating"
                :items="contacts"
                item-title="name"
                item-value="id"
                label="Contactos"
                chips
                closable-chips
                multiple
                required
                return-object
              >
                <template v-slot:chip="{ props, item }">
                  <v-chip
                    v-bind="props"
                    :text="item.raw.nombre"
                  ></v-chip>
                </template>

                <template v-slot:item="{ props, item }">
                  <v-list-item
                    v-bind="props"
                    :subtitle="item.raw.empresa"
                    :title="item.raw.nombre"
                  ></v-list-item>
                </template>
              </v-autocomplete>
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
    import { ref, watch } from 'vue'
    import { addMember } from '@/services/chats'
    import { createContact, validateContactCompany } from '@/services/contacts'
    import { getQuotationContacts } from '@/services/quotations'
    import MessageAlertDialog from '@/components/MessageAlertDialog.vue'

    const props = defineProps({
        showActivator: {
            type: Boolean,
            default: true,
        },
        chatId: {
            type: [Number, String],
            default: null,
        },
        quotationId: {
            type: [Number, String],
            default: null,
        },
    })
    const emit = defineEmits(['member-added'])

    const dialog = defineModel({ default: false })
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

    /*const loadContactsAvailableChat = async (chat_id) => {
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
    }*/

    const loadQuotationContacts = async (quotation_id) => {
        contactsError.value = ''
        clearForm()

        if (!quotation_id) {
            contacts.value = []
            return
        }

        try {
            const contactsList = await getQuotationContacts(quotation_id)
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
            const selectedContacts = Array.isArray(contactId.value) ? contactId.value : []

            if (!selectedContacts.length) {
                throw new Error('Selecciona al menos un contacto.')
            }

            const contactIds = await Promise.all(selectedContacts.map(async (contact) => {
                const companyContactId = contact.idempresa_contacto

                if (!companyContactId) {
                    throw new Error('El contacto seleccionado no tiene un identificador de empresa.')
                }

                const validatedContact = await validateContactCompany(companyContactId)

                if (validatedContact?.exists === false) {
                    const createdContact = await createContact({
                        name: contact.nombre ?? contact.name ?? '',
                        phone_number: contact.tel_directo ?? contact.phone_number ?? contact.phone ?? '',
                        display_name: contact.nombre ?? contact.display_name ?? contact.nombre ?? contact.name ?? '',
                        company: contact.empresa ?? contact.company ?? '',
                        position: contact.funcion ?? contact.position ?? contact.funcion ?? '',
                        idempresa_contacto: companyContactId,
                        fk_idempresa: contact.fk_idempresa ?? null,
                    })
                    const createdContactId = createdContact?.id ?? createdContact?.contact_id

                    if (!createdContactId) {
                        throw new Error('No se obtuvo el identificador del contacto creado.')
                    }

                    return createdContactId
                }

                const existingContactId = validatedContact?.data.id

                if (!existingContactId) {
                    throw new Error('No se pudo validar el contacto seleccionado.')
                }

                return existingContactId
            }))

            await addMember({
                chat_id: props.chatId,
                quotation_id: props.quotationId,
                contact_ids: contactIds,
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

    //watch(() => props.chatId, loadContactsAvailableChat, { immediate: true })
    watch(() => props.quotationId, loadQuotationContacts, { immediate: true })

    watch(dialog, (isOpen) => {
        if (!isOpen) {
            clearForm()
        }
    })

</script>
