<template>
  <div class="contact-requests-view pa-6">
    <v-container>
      <div class="d-flex align-center justify-space-between mb-6">
        <div>
          <h1 class="text-h4">Solicitudes de contacto</h1>
          <p class="text-medium-emphasis mt-1">
            Solicitudes pendientes y registradas por chat.
          </p>
        </div>
        <div class="d-flex align-center ga-3">
          <v-select
            v-model="selectedStatus"
            :items="statusOptions"
            density="compact"
            hide-details
            item-title="title"
            item-value="value"
            label="Estatus"
            min-width="180"
            variant="outlined"
            @update:model-value="loadContactRequests"
          />
          <v-btn
            :loading="loading"
            color="primary"
            icon="mdi-refresh"
            title="Actualizar solicitudes"
            @click="loadContactRequests"
          />
        </div>
      </div>

      <v-progress-linear v-if="loading" color="primary" indeterminate class="mb-4" />

      <v-alert v-if="errorMessage" type="error" class="mb-4">
        {{ errorMessage }}
      </v-alert>

      <v-row v-if="requests.length">
        <v-col v-for="request in requests" :key="request.id" cols="12" md="6" lg="4">
          <v-card class="request-card h-100" variant="elevated">
            <v-card-item>
              <template #prepend>
                <v-avatar color="primary" variant="tonal">
                  <v-icon icon="mdi-account-clock-outline" />
                </v-avatar>
              </template>
              <v-card-title>{{ request.contact_display_name || request.contact_name }}</v-card-title>
              <v-card-subtitle>{{ request.contact_name }}</v-card-subtitle>
              <template #append>
                <v-chip :color="statusColor(request.status)" size="small" variant="tonal">
                  {{ statusLabel(request.status) }}
                </v-chip>
              </template>
            </v-card-item>

            <v-divider />

            <v-card-text class="request-details">
              <div><v-icon icon="mdi-forum-outline" size="small" /> <h3>{{ request.chat?.name }} #{{ request.chat?.quotation_id }}</h3>- {{ request.chat?.description }}</div>
              <div><v-icon icon="mdi-phone-outline" size="small" /> {{ request.contact_phone_number }}</div>
              <div v-if="request.contact_company"><v-icon icon="mdi-domain" size="small" /> {{ request.contact_company }}</div>
              <div v-if="request.contact_position"><v-icon icon="mdi-briefcase-outline" size="small" /> {{ request.contact_position }}</div>
            </v-card-text>

            <v-card-actions class="px-4 pb-4">
              <span class="text-caption text-medium-emphasis">
                <v-icon icon="mdi-calendar-outline" size="small" class="mr-1" />
                {{ formatDate(request.created_at) }}
              </span>
              <v-spacer />
              <v-btn
                v-if="request.status === 'pending'"
                :loading="approvingId === request.id"
                color="success"
                prepend-icon="mdi-check"
                size="small"
                variant="elevated"
                @click="approveRequest(request.id)"
              >
                Aceptar
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-col>
      </v-row>

      <v-empty-state
        v-else-if="!loading && !errorMessage"
        headline="Sin solicitudes"
        text="No hay solicitudes de contacto registradas."
        icon="mdi-account-clock-outline"
      />
    </v-container>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { approveContactRequest, getContactsRequests } from '@/services/contacts'

const requests = ref([])
const loading = ref(false)
const approvingId = ref(null)
const errorMessage = ref('')
const selectedStatus = ref('pending')

const statusOptions = [
  { title: 'Pendientes', value: 'pending' },
  { title: 'Aprobadas', value: 'approved' },
  { title: 'Rechazadas', value: 'rejected' },
]

const statusLabels = {
  pending: 'Pendiente',
  approved: 'Aprobada',
  rejected: 'Rechazada',
}

const statusColor = (status) => ({ pending: 'warning', approved: 'success', rejected: 'error' })[status] || 'secondary'
const statusLabel = (status) => statusLabels[status] || status || 'Sin estado'

const formatDate = (date) => {
  if (!date) return 'Fecha no disponible'

  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date))
}

const loadContactRequests = async () => {
  loading.value = true
  errorMessage.value = ''

  try {
    requests.value = await getContactsRequests(selectedStatus.value)
  } catch (error) {
    console.error('Error al cargar solicitudes de contacto:', error)
    errorMessage.value = error.response?.data?.message || 'No se pudieron cargar las solicitudes de contacto.'
  } finally {
    loading.value = false
  }
}

const approveRequest = async (requestId) => {
  approvingId.value = requestId
  errorMessage.value = ''

  try {
    await approveContactRequest(requestId)
    await loadContactRequests()
  } catch (error) {
    console.error('Error al aprobar solicitud de contacto:', error)
    errorMessage.value = error.response?.data?.message || 'No se pudo aprobar la solicitud de contacto.'
  } finally {
    approvingId.value = null
  }
}

onMounted(loadContactRequests)
</script>

<style scoped>
.contact-requests-view {
  min-height: 100vh;
  background-color: var(--vt-c-bg);
}

.request-card {
  display: flex;
  flex-direction: column;
}

.request-details {
  display: grid;
  gap: 12px;
}

.request-details > div {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
