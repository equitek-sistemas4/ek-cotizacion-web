<template>
  <v-dialog v-model="dialog" max-width="600">
    <template #activator="{ props: activatorProps }">
      <slot name="activator" :props="activatorProps">
        <v-btn v-bind="activatorProps" />
      </slot>
    </template>

    <v-card prepend-icon="mdi-shield-plus-outline" title="Registrar rol">
      <v-card-text>
        <v-row density="comfortable">
          <v-col cols="12">
            <v-text-field
              v-model="form.name"
              label="Nombre del rol"
              placeholder="Ingresa el nombre del rol"
              required
            />
          </v-col>

          <v-col cols="12">
            <v-textarea
              v-model="form.description"
              label="Descripción"
              placeholder="Ingresa una descripción opcional"
              rows="3"
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
        <v-btn color="primary" variant="elevated" :loading="loading" @click="handleCreateRole">
          Registrar
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref } from 'vue'
import { createRole } from '@/services/roles'

const emit = defineEmits(['role-created'])

const dialog = ref(false)
const loading = ref(false)
const errorMessage = ref('')
const form = ref({
  name: '',
  description: '',
})

const clearForm = () => {
  form.value = {
    name: '',
    description: '',
  }
  errorMessage.value = ''
}

const closeDialog = () => {
  dialog.value = false
  clearForm()
}

const handleCreateRole = async () => {
  if (!form.value.name.trim()) {
    errorMessage.value = 'El nombre del rol es requerido.'
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    await createRole({
      name: form.value.name.trim(),
      description: form.value.description.trim(),
    })
    emit('role-created')
    closeDialog()
  } catch (error) {
    console.error('Error al crear rol:', error)
    errorMessage.value =
      error.response?.data?.message || 'No se pudo registrar el rol. Por favor, intenta de nuevo.'
  } finally {
    loading.value = false
  }
}
</script>
