<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getChats } from '@/services/chats'
import { getQuotationInfo } from '@/services/quotations'

const router = useRouter()
const quotations = ref([])
const loading = ref(false)
const errorMessage = ref('')

const getQuotationId = (chat) =>
  chat?.quotation_id ?? chat?.quotationId ?? chat?.quotation?.id ?? chat?.quotation?.idcoti ?? null

const buildQuotationRow = async (chat) => {
  const quotationId = getQuotationId(chat)
  let quotationInfo = null
  let prospectInfo = null

  try {
    const quotationData = await getQuotationInfo(quotationId)
    quotationInfo = quotationData?.quotation_info ?? quotationData?.data?.quotation_info ?? null
    prospectInfo = quotationData?.quotation_prospect_info ?? quotationData?.data?.quotation_prospect_info ?? null
  } catch {
    // Se conservan los datos del chat si el detalle de la cotización no está disponible.
  }

  return {
    id: quotationId,
    number: quotationInfo?.idcoti ?? quotationId,
    company:
      quotationInfo?.empresa ??
      prospectInfo?.empresa ??
      chat?.quotation?.empresa ??
      chat?.company ??
      chat?.name ??
      'Sin empresa',
    description:
      quotationInfo?.descripcion ??
      quotationInfo?.description ??
      chat?.description ??
      chat?.chat_description ??
      'Sin descripción',
  }
}

const loadQuotations = async () => {
  loading.value = true
  errorMessage.value = ''

  try {
    const chats = await getChats()
    const chatsByQuotation = new Map()

    chats.forEach((chat) => {
      const quotationId = getQuotationId(chat)

      if (quotationId !== null && quotationId !== undefined && !chatsByQuotation.has(String(quotationId))) {
        chatsByQuotation.set(String(quotationId), chat)
      }
    })

    const results = await Promise.all([...chatsByQuotation.values()].map(buildQuotationRow))
    quotations.value = results.sort((first, second) => Number(second.number) - Number(first.number))
  } catch (error) {
    errorMessage.value = error.response?.data?.message || error.message || 'No se pudieron cargar las cotizaciones con chat.'
  } finally {
    loading.value = false
  }
}

const openDetails = (quotation) => {
  router.push({
    name: 'quotation-event-details',
    params: { quotationId: quotation.id },
  })
}

onMounted(loadQuotations)
</script>

<template>
  <v-container class="quotation-events-view pa-6" fluid>
    <div class="d-flex align-center justify-space-between mb-6">
      <div>
        <h1 class="text-h4">Actividad de cotizaciones</h1>
        <p class="text-medium-emphasis mt-1">Eventos realizados por los contactos desde la cotizacion web.</p>
      </div>
      <v-btn
        :loading="loading"
        color="primary"
        icon="mdi-refresh"
        title="Actualizar cotizaciones"
        @click="loadQuotations"
      />
    </div>

    <v-progress-linear v-if="loading" class="mb-4" color="primary" indeterminate />
    <v-alert v-if="errorMessage" class="mb-4" type="error">{{ errorMessage }}</v-alert>

    <v-card v-if="quotations.length" variant="elevated">
      <v-table>
        <thead>
          <tr>
            <th>Número</th>
            <th>Empresa</th>
            <th>Descripción</th>
            <th class="text-center">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="quotation in quotations" :key="quotation.id">
            <td>#{{ quotation.number }}</td>
            <td>{{ quotation.company }}</td>
            <td>{{ quotation.description }}</td>
            <td class="text-center">
              <v-btn
                aria-label="Ver eventos de la cotización"
                color="primary"
                icon="mdi-eye-outline"
                size="small"
                title="Ver detalles"
                variant="text"
                @click="openDetails(quotation)"
              />
            </td>
          </tr>
        </tbody>
      </v-table>
    </v-card>

    <v-empty-state
      v-else-if="!loading && !errorMessage"
      headline="Sin cotizaciones con chat"
      icon="mdi-forum-outline"
      text="No hay cotizaciones asociadas a chats para mostrar."
    />

  </v-container>
</template>

<style scoped>
.quotation-events-view {
  min-height: 100vh;
}

th {
  font-weight: 700;
}
</style>
