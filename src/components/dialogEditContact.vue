<template>
  <v-dialog v-model="dialog" max-width="600">
    <template v-slot:activator="{ props: activatorProps }">
      <slot name="activator" :props="activatorProps">
        <v-btn v-bind="activatorProps" />
      </slot>
    </template>

    <v-card prepend-icon="mdi-account-edit" title="Editar Contacto">
      <v-card-text>
        <v-row density="comfortable">
          <v-col cols="12">
            <v-text-field
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
              v-model="form.display_name"
              label="Nombre Mostrado"
              placeholder="Ingrese el nombre mostrado"
              outlined
              dense
            />
          </v-col>

          <v-col cols="12">
            <v-text-field
              v-model="form.company"
              label="Empresa"
              placeholder="Ingrese la empresa"
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
          text="Actualizar"
          variant="elevated"
          :loading="loading"
          @click="handleUpdateContact"
        />
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { updateContact } from '@/services/contacts'

const props = defineProps({
  contact: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['contact-updated'])

const dialog = ref(false)
const loading = ref(false)
const errorMessage = ref('')

const form = ref({
  name: '',
  phone_number: '',
  display_name: '',
  company: '',
})

// Cuando se abre el diálogo y hay un contacto, precarga los datos
watch(dialog, (newVal) => {
  if (newVal && props.contact) {
    form.value = {
      name: props.contact.name || '',
      phone_number: props.contact.phone_number || '',
      display_name: props.contact.display_name || '',
      company: props.contact.company || '',
    }
    errorMessage.value = ''
  }
})

const closeDialog = () => {
  dialog.value = false
  clearForm()
}

const clearForm = () => {
  form.value = {
    name: '',
    phone_number: '',
    display_name: '',
    company: '',
  }
  errorMessage.value = ''
}

const handleUpdateContact = async () => {
  // Validación básica
  if (!form.value.name || !form.value.phone_number) {
    errorMessage.value = 'El nombre y teléfono son campos requeridos'
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    await updateContact({
      contact_id: props.contact.id,
      name: form.value.name,
      phone_number: form.value.phone_number,
      display_name: form.value.display_name,
      company: form.value.company,
    })

    emit('contact-updated')
    closeDialog()
  } catch (error) {
    console.error('Error al actualizar contacto:', error)
    errorMessage.value =
      error.response?.data?.message ||
      'Error al actualizar el contacto. Por favor, intenta de nuevo.'
  } finally {
    loading.value = false
  }
}
</script>
