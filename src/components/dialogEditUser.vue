<template>
  <v-dialog v-model="dialog" max-width="600">
    <v-card prepend-icon="mdi-account-edit" title="Editar usuario">
      <v-card-text>
        <v-row density="comfortable">
          <v-col cols="12">
            <v-text-field v-model="form.name" label="Nombre" required />
          </v-col>

          <v-col cols="12">
            <v-text-field
              v-model="form.email"
              label="Correo electrónico"
              type="email"
              :rules="[emailRule]"
              required
            />
          </v-col>

          <v-col cols="12">
            <v-text-field v-model="form.phone_number" label="Teléfono" required />
          </v-col>
        </v-row>

        <v-alert v-if="errorMessage" class="mt-4" type="error">
          {{ errorMessage }}
        </v-alert>
      </v-card-text>

      <v-divider />

      <v-card-actions>
        <v-spacer />
        <v-btn color="secondary" variant="elevated" @click="closeDialog">Cancelar</v-btn>
        <v-btn color="primary" variant="elevated" :loading="loading" @click="handleUpdateUser">
          Actualizar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { updateUser } from '@/services/users'

const props = defineProps({
  modelValue: Boolean,
  user: {
    type: Object,
    default: null,
  },
})

const emit = defineEmits(['update:modelValue', 'user-updated'])

const loading = ref(false)
const errorMessage = ref('')
const form = ref({
  name: '',
  email: '',
  phone_number: '',
})

const dialog = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value),
})

const emailRule = (value) => /.+@.+\..+/.test(value) || 'Ingresa un correo electrónico válido.'

const clearForm = () => {
  form.value = {
    name: '',
    email: '',
    phone_number: '',
  }
  errorMessage.value = ''
}

const closeDialog = () => {
  dialog.value = false
  clearForm()
}

watch(dialog, (isOpen) => {
  if (isOpen && props.user) {
    form.value = {
      name: props.user.name || '',
      email: props.user.email || '',
      phone_number: props.user.phone_number || '',
    }
    errorMessage.value = ''
  }
})

const handleUpdateUser = async () => {
  if (!props.user) return

  if (!form.value.name || !form.value.email || !form.value.phone_number) {
    errorMessage.value = 'Nombre, correo electrónico y teléfono son campos requeridos.'
    return
  }

  if (!/.+@.+\..+/.test(form.value.email)) {
    errorMessage.value = 'Ingresa un correo electrónico válido.'
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    await updateUser({
      user_id: props.user.user_id ?? props.user.id,
      ...form.value,
    })
    emit('user-updated')
    closeDialog()
  } catch (error) {
    console.error('Error al actualizar usuario:', error)
    errorMessage.value =
      error.response?.data?.message || 'No se pudo actualizar el usuario. Por favor, intenta de nuevo.'
  } finally {
    loading.value = false
  }
}
</script>
