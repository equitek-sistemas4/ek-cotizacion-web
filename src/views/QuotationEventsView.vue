<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getChats } from '@/services/chats'
import { getQuotationEvents } from '@/services/quotation_events'

const router = useRouter()
const quotations = ref([])
const loading = ref(false)
const errorMessage = ref('')
const quotationEvents = ref([])

const getQuotationId = (chat) =>
  chat?.quotation_id ?? chat?.quotationId ?? chat?.quotation?.id ?? chat?.quotation?.idcoti ?? null

const getEventQuotationId = (event) => event?.quotation_id ?? event?.quotation?.id ?? null
const getEventContactId = (event) => event?.contact_id ?? event?.contact?.id ?? event?.contact?.contact_id ?? null

const formatSectionName = (section) => ({
  home: 'Inicio', products: 'Productos', equipment: 'Equipos', prices: 'Precios', scopes: 'Alcances',
  conditions: 'Condiciones', financial: 'Análisis financiero', links: 'Ligas',
})[section] ?? section ?? 'Sin sección'

const formatDate = (dateValue) => {
  const date = new Date(dateValue)
  return Number.isNaN(date.getTime())
    ? 'Sin interacciones'
    : new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

const quotationEventsById = computed(() => quotationEvents.value.reduce((result, event) => {
  const quotationId = getEventQuotationId(event)
  if (quotationId != null) (result[String(quotationId)] ??= []).push(event)
  return result
}, {}))

const quotationStats = computed(() => quotations.value.map((quotation) => {
  const events = quotationEventsById.value[String(quotation.id)] ?? []
  const openings = events.filter((event) => event?.event_name === 'quotation_opened').length
  const contacts = new Set(events.map(getEventContactId).filter((id) => id != null)).size
  const sections = events.filter((event) => event?.event_name === 'section_opened' && event?.section_key)
    .reduce((counts, event) => ({ ...counts, [event.section_key]: (counts[event.section_key] ?? 0) + 1 }), {})
  const topSection = Object.entries(sections).sort(([, a], [, b]) => b - a)[0]?.[0]
  const latestInteraction = events.reduce((latest, event) => (
    !latest || new Date(event.created_at) > new Date(latest.created_at) ? event : latest
  ), null)
  return { ...quotation, openings, contacts, topSection, latestInteraction }
}))

const activeQuotationsCount = computed(() => quotationStats.value.filter((quotation) => quotation.latestInteraction).length)
const totalOpenings = computed(() => quotationEvents.value.filter((event) => event?.event_name === 'quotation_opened').length)
const activeContactsCount = computed(() => new Set(quotationEvents.value.map(getEventContactId).filter((id) => id != null)).size)
const latestInteraction = computed(() => quotationEvents.value.reduce((latest, event) => (
  !latest || new Date(event.created_at) > new Date(latest.created_at) ? event : latest
), null))
const mostViewedQuotation = computed(() => [...quotationStats.value].sort((a, b) => b.openings - a.openings)[0] ?? null)
const topSection = computed(() => {
  const counts = quotationEvents.value.filter((event) => event?.event_name === 'section_opened' && event?.section_key)
    .reduce((result, event) => ({ ...result, [event.section_key]: (result[event.section_key] ?? 0) + 1 }), {})
  return Object.entries(counts).sort(([, a], [, b]) => b - a)[0] ?? null
})
const dailyOpenings = computed(() => {
  const counts = quotationEvents.value.filter((event) => event?.event_name === 'quotation_opened' && event?.created_at)
    .reduce((result, event) => {
      const date = new Date(event.created_at)
      if (Number.isNaN(date.getTime())) return result
      const key = [date.getFullYear(), date.getMonth(), date.getDate()].join('-')
      result[key] ??= { date, count: 0 }
      result[key].count += 1
      return result
    }, {})
  return Object.values(counts).sort((a, b) => a.date - b.date).slice(-14)
})
const maxDailyOpenings = computed(() => Math.max(...dailyOpenings.value.map(({ count }) => count), 1))
const formatChartDate = (date) => new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' }).format(date)

const buildQuotationRow = (chat) => {
  const quotationId = getQuotationId(chat)

  return {
    id: quotationId,
    number: chat?.quotation_id ?? quotationId,
    company: chat?.name ?? 'Sin empresa',
    description: chat?.description ?? 'Sin descripción',
  }
}

const loadQuotations = async () => {
  loading.value = true
  errorMessage.value = ''

  try {
    const [chats, events] = await Promise.all([getChats(), getQuotationEvents()])
    const chatsByQuotation = new Map()

    chats.forEach((chat) => {
      const quotationId = getQuotationId(chat)

      if (quotationId !== null && quotationId !== undefined && !chatsByQuotation.has(String(quotationId))) {
        chatsByQuotation.set(String(quotationId), chat)
      }
    })

    const results = [...chatsByQuotation.values()].map(buildQuotationRow)
    quotations.value = results.sort((first, second) => Number(second.number) - Number(first.number))
    quotationEvents.value = events
  } catch (error) {
    quotationEvents.value = []
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

    <template v-if="quotations.length">
      <v-row class="mb-2">
        <v-col cols="12" sm="6" lg="2"><v-card class="summary-card h-100" variant="elevated"><v-card-item prepend-icon="mdi-file-chart-outline"><v-card-subtitle>Cotizaciones con actividad</v-card-subtitle><v-card-title>{{ activeQuotationsCount }}</v-card-title></v-card-item></v-card></v-col>
        <v-col cols="12" sm="6" lg="2"><v-card class="summary-card h-100" variant="elevated"><v-card-item prepend-icon="mdi-eye-outline"><v-card-subtitle>Aperturas totales</v-card-subtitle><v-card-title>{{ totalOpenings }}</v-card-title></v-card-item></v-card></v-col>
        <v-col cols="12" sm="6" lg="2"><v-card class="summary-card h-100" variant="elevated"><v-card-item prepend-icon="mdi-account-group-outline"><v-card-subtitle>Contactos activos</v-card-subtitle><v-card-title>{{ activeContactsCount }}</v-card-title></v-card-item></v-card></v-col>
        <v-col cols="12" sm="6" lg="2"><v-card class="summary-card h-100" variant="elevated"><v-card-item prepend-icon="mdi-fire"><v-card-subtitle>Cotización más consultada</v-card-subtitle><v-card-title>{{ mostViewedQuotation?.openings ? `#${mostViewedQuotation.number}` : 'Sin datos' }}</v-card-title><v-card-text v-if="mostViewedQuotation?.openings">{{ mostViewedQuotation.openings }} aperturas</v-card-text></v-card-item></v-card></v-col>
        <v-col cols="12" sm="6" lg="2"><v-card class="summary-card h-100" variant="elevated"><v-card-item prepend-icon="mdi-chart-bar"><v-card-subtitle>Sección de mayor interés</v-card-subtitle><v-card-title>{{ topSection ? formatSectionName(topSection[0]) : 'Sin datos' }}</v-card-title><v-card-text v-if="topSection">{{ topSection[1] }} aperturas</v-card-text></v-card-item></v-card></v-col>
        <v-col cols="12" sm="6" lg="2"><v-card class="summary-card h-100" variant="elevated"><v-card-item prepend-icon="mdi-clock-outline"><v-card-subtitle>Última interacción</v-card-subtitle><v-card-title class="summary-card__date">{{ formatDate(latestInteraction?.created_at) }}</v-card-title></v-card-item></v-card></v-col>
      </v-row>

      <v-card class="mb-6" variant="elevated">
        <v-card-title>Aperturas por día</v-card-title>
        <v-card-text>
          <div v-if="dailyOpenings.length" class="daily-openings-chart">
            <div v-for="day in dailyOpenings" :key="day.date.toISOString()" class="daily-openings-chart__item">
              <strong>{{ day.count }}</strong>
              <div class="daily-openings-chart__track">
                <div class="daily-openings-chart__bar" :style="{ height: `${(day.count / maxDailyOpenings) * 100}%` }" />
              </div>
              <span>{{ formatChartDate(day.date) }}</span>
            </div>
          </div>
          <span v-else class="text-caption text-medium-emphasis">Aún no hay aperturas registradas.</span>
          <span v-if="dailyOpenings.length" class="text-caption text-medium-emphasis">Mostrando los últimos 14 días con aperturas.</span>
        </v-card-text>
      </v-card>

    <v-card variant="elevated">
      <v-table>
        <thead>
          <tr>
            <th>Número</th>
            <th>Empresa</th>
            <th>Descripción</th>
            <th class="text-center">Aperturas</th>
            <th class="text-center">Contactos</th>
            <th>Sección más vista</th>
            <th>Última interacción</th>
            <th class="text-center">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="quotation in quotationStats" :key="quotation.id">
            <td>#{{ quotation.number }}</td>
            <td>{{ quotation.company }}</td>
            <td>{{ quotation.description }}</td>
            <td class="text-center">{{ quotation.openings }}</td>
            <td class="text-center">{{ quotation.contacts }}</td>
            <td>{{ quotation.topSection ? formatSectionName(quotation.topSection) : 'Sin datos' }}</td>
            <td>{{ formatDate(quotation.latestInteraction?.created_at) }}</td>
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
    </template>

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

.summary-card :deep(.v-card-title) {
  font-size: 1.15rem;
}

.summary-card__date {
  font-size: .9rem !important;
  white-space: normal;
}

.daily-openings-chart {
  display: flex;
  align-items: end;
  gap: 12px;
  min-height: 180px;
  padding-top: 12px;
  overflow-x: auto;
}

.daily-openings-chart__item {
  display: grid;
  flex: 1 0 48px;
  grid-template-rows: auto 120px auto;
  align-items: end;
  gap: 6px;
  text-align: center;
}

.daily-openings-chart__item strong {
  color: rgb(var(--v-theme-textPrimary));
}

.daily-openings-chart__track {
  display: flex;
  align-items: end;
  width: 100%;
  height: 120px;
  border-radius: 6px 6px 0 0;
  background: rgb(var(--v-theme-surfaceVariant));
}

.daily-openings-chart__bar {
  width: 100%;
  min-height: 4px;
  border-radius: inherit;
  background: rgb(var(--v-theme-primary));
}

.daily-openings-chart__item span {
  color: rgb(var(--v-theme-textMuted));
  font-size: .75rem;
  white-space: nowrap;
}

th {
  font-weight: 700;
}
</style>
