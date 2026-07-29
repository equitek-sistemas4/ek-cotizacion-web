<template>
  <v-dialog v-model="dialog" max-width="600">
    <template #activator="{ props: activatorProps }">
      <slot name="activator" :props="activatorProps">
        <v-btn v-bind="activatorProps" />
      </slot>
    </template>

    <v-card prepend-icon="mdi-account-plus" title="Crear usuario">
      <v-card-text>
        <v-row density="comfortable">
          <v-col cols="12">
            <v-text-field
              v-model="form.name"
              label="Nombre"
              placeholder="Ingresa el nombre"
              required
            />
          </v-col>

          <v-col cols="12">
            <v-text-field
              v-model="form.email"
              label="Correo electrónico"
              placeholder="usuario@correo.com"
              type="email"
              :rules="[emailRule]"
              required
            />
          </v-col>

          <v-col cols="12">
            <v-text-field
              v-model="form.password"
              label="Contraseña"
              placeholder="Ingresa la contraseña"
              type="password"
              required
            />
          </v-col>

          <v-col cols="12">
            <v-text-field
              v-model="form.phone_number"
              label="Teléfono"
              type="number"
              placeholder="Ingresa el número de teléfono"
              required
            />
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
        <v-btn color="primary" variant="elevated" :loading="loading" @click="handleCreateUser">
          Crear
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref } from 'vue'
import { createUser } from '@/services/users'

const emit = defineEmits(['user-created'])

const dialog = ref(false)
const loading = ref(false)
const errorMessage = ref('')
const form = ref({
  name: '',
  email: '',
  password: '',
  phone_number: '',
})

const emailRule = (value) => /.+@.+\..+/.test(value) || 'Ingresa un correo electrónico válido.'

const clearForm = () => {
  form.value = {
    name: '',
    email: '',
    password: '',
    phone_number: '',
  }
  errorMessage.value = ''
}

const closeDialog = () => {
  dialog.value = false
  clearForm()
}

const handleCreateUser = async () => {
  if (!form.value.name || !form.value.email || !form.value.password || !form.value.phone_number) {
    errorMessage.value = 'Nombre, correo electrónico, contraseña y teléfono son campos requeridos.'
    return
  }

  if (!/.+@.+\..+/.test(form.value.email)) {
    errorMessage.value = 'Ingresa un correo electrónico válido.'
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    await createUser(form.value)
    emit('user-created')
    closeDialog()
  } catch (error) {
    console.error('Error al crear usuario:', error)
    errorMessage.value =
      error.response?.data?.message || 'No se pudo crear el usuario. Por favor, intenta de nuevo.'
  } finally {
    loading.value = false
  }
}
</script>
