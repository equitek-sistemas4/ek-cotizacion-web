<template>
  <v-dialog v-model="dialog" max-width="600">
    <template v-slot:activator="{ props: activatorProps }">
      <slot name="activator" :props="activatorProps">
        <v-btn v-bind="activatorProps" />
      </slot>
    </template>

    <v-card prepend-icon="mdi-account-plus" title="Crear Contacto">
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

          <v-col cols="12" sm="3">
            <v-select
              v-model="phoneCountryCode"
              :items="phoneCountryCodes"
              item-title="label"
              item-value="value"
              label="Lada"
              outlined
              dense
            />
          </v-col>

          <v-col cols="12" sm="9">
            <v-text-field
              v-model="form.phone_number"
              :rules="[phoneRule]"
              counter="10"
              inputmode="numeric"
              label="Teléfono"
              maxlength="10"
              placeholder="Ingresa 10 dígitos"
              required
              outlined
              dense
              @update:model-value="sanitizePhone"
            />
          </v-col>

          <v-col cols="12">
            <v-text-field
              v-model="form.email"
              :rules="[emailRule]"
              label="Correo electrónico"
              placeholder="correo@empresa.com"
              required
              type="email"
              outlined
              dense
            />
          </v-col>

          <v-col cols="12">
            <v-autocomplete
              v-model="form.id_empresa"
              :items="companies"
              :loading="companiesLoading"
              clearable
              item-title="empresa"
              item-value="idempresa"
              label="Empresa"
              no-data-text="No hay empresas disponibles"
              placeholder="Selecciona una empresa"
              outlined
              dense
            />
          </v-col>

          <v-col cols="12">
            <v-select
              v-model="form.position"
              :items="['Usuario', 'Mantenimiento', 'Project Manager', 'Produccion', 'Compras', 'Financiero', 'Dueño', 'Director General', 'Directivo']"
              label="Puesto"
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
          text="Crear"
          variant="elevated"
          :loading="loading"
          @click="handleCreateContact"
        />
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { createDirectContact, getContactCompanies } from '@/services/contacts'

const emit = defineEmits(['contact-created'])

const dialog = ref(false)
const loading = ref(false)
const errorMessage = ref('')
const companies = ref([])
const companiesLoading = ref(false)
const phoneCountryCode = ref('+52')
const phoneCountryCodes = [
  { label: 'MX (+52)', value: '+52' },
  { label: 'EE.UU. (+1)', value: '+1' },
]

const form = ref({
  name: '',
  phone_number: '',
  email: '',
  id_empresa: null,
  position: '',
})

const closeDialog = () => {
  dialog.value = false
  clearForm()
}

const clearForm = () => {
  form.value = {
    name: '',
    phone_number: '',
    email: '',
    id_empresa: null,
    position: '',
  }
  phoneCountryCode.value = '+52'
  errorMessage.value = ''
}

const sanitizePhone = (value) => {
  form.value.phone_number = String(value ?? '').replace(/\D/g, '').slice(0, 10)
}

const phoneRule = (value) => /^\d{10}$/.test(value) || 'Ingresa un teléfono válido de 10 dígitos'
const emailRule = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) || 'Ingresa un correo electrónico válido'

const loadCompanies = async () => {
  companiesLoading.value = true

  try {
    companies.value = await getContactCompanies()
  } catch (error) {
    console.error('No se pudieron cargar las empresas:', error)
    companies.value = []
  } finally {
    companiesLoading.value = false
  }
}

const handleCreateContact = async () => {
  if (!form.value.name || !form.value.phone_number || !form.value.email || !form.value.id_empresa) {
    errorMessage.value = 'El nombre, teléfono, correo y empresa son campos requeridos'
    return
  }

  if (phoneRule(form.value.phone_number) !== true) {
    errorMessage.value = 'Ingresa un teléfono válido de 10 dígitos'
    return
  }

  if (emailRule(form.value.email) !== true) {
    errorMessage.value = 'Ingresa un correo electrónico válido'
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    await createDirectContact({
      name: form.value.name,
      phone_number: `${phoneCountryCode.value.replace('+', '')}${form.value.phone_number}`,
      email: form.value.email,
      display_name: form.value.name,
      id_empresa: form.value.id_empresa,
      position: form.value.position,
    })

    emit('contact-created')
    closeDialog()
  } catch (error) {
    console.error('Error al crear contacto:', error)
    errorMessage.value =
      error.response?.data?.message ||
      'Error al crear el contacto. Por favor, intenta de nuevo.'
  } finally {
    loading.value = false
  }
}

watch(dialog, (isOpen) => {
  if (isOpen && !companies.value.length) {
    loadCompanies()
  }
})
</script>
