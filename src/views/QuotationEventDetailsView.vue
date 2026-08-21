<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getQuotationContactsEvents, getQuotationEvents } from '@/services/quotation_events'
import { getQuotationInfo } from '@/services/quotations'

const route = useRoute()
const router = useRouter()
const quotationId = computed(() => route.params.quotationId)
const loading = ref(false)
const errorMessage = ref('')
const quotation = ref(null)
const quotationOpenedCount = ref(0)
const quotationOpenedSeries = ref([0])
const quotationOpenedLabels = ref(['Sin aperturas'])
const sectionCounts = ref([])
const contactStats = ref([])
const trackedSections = ['home', 'products', 'equipment', 'prices', 'financial', 'links']
const latestInteraction = ref(null)
const topInteractingContact = ref(null)

const maxSectionCount = computed(() => Math.max(...sectionCounts.value.map((section) => section.count), 1))

const formatSectionName = (section) => ({
  home: 'Inicio',
  products: 'Productos',
  equipment: 'Equipos',
  prices: 'Precios',
  scopes: 'Alcances',
  conditions: 'Condiciones',
  financial: 'Análisis financiero',
  links: 'Ligas',
})[section] ?? section

const getContactId = (contact) => contact?.id ?? contact?.contact_id ?? contact?.id_contact ?? null
const getContactName = (contact) =>
  contact?.display_name ?? contact?.nombre ?? contact?.name ?? contact?.contact_name ?? 'Contacto sin nombre'

const buildSectionCounts = (events) => {
  const counts = events
    .filter((event) => event?.event_name === 'section_opened' && event?.section_key)
    .reduce((result, event) => {
      result[event.section_key] = (result[event.section_key] ?? 0) + 1
      return result
    }, {})

  return Object.entries(counts)
    .map(([section, count]) => ({ section, count }))
    .sort((first, second) => second.count - first.count)
}

const formatSparklineDate = (dateValue) => {
  const date = new Date(dateValue)

  return Number.isNaN(date.getTime())
    ? ''
    : new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short' }).format(date)
}

const formatDate = (dateValue) => {
  if (!dateValue) {
    return 'Sin interacciones'
  }

  const date = new Date(dateValue)
  return Number.isNaN(date.getTime())
    ? String(dateValue)
    : new Intl.DateTimeFormat('es-MX', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

const loadEventSummary = async () => {
  loading.value = true
  errorMessage.value = ''

  try {
    const [quotationData, allEvents, contactsEvents] = await Promise.all([
      getQuotationInfo(quotationId.value).catch(() => null),
      getQuotationEvents(),
      getQuotationContactsEvents(quotationId.value),
    ])
    const quotationInfo = quotationData?.quotation_info ?? quotationData?.data?.quotation_info ?? null
    const prospectInfo = quotationData?.quotation_prospect_info ?? quotationData?.data?.quotation_prospect_info ?? null

    quotation.value = {
      number: quotationInfo?.idcoti ?? quotationId.value,
      company: quotationInfo?.empresa ?? prospectInfo?.empresa ?? 'Sin empresa',
      description: quotationInfo?.descripcion ?? quotationInfo?.description ?? 'Sin descripción',
    }

    const events = allEvents.filter(
      (event) => String(event?.quotation_id ?? event?.quotation?.id) === String(quotationId.value),
    )
    const quotationOpenedEvents = events
      .filter((event) => event?.event_name === 'quotation_opened')
      .sort((first, second) => new Date(first.created_at) - new Date(second.created_at))

    quotationOpenedCount.value = quotationOpenedEvents.length
    quotationOpenedSeries.value = quotationOpenedEvents.length
      ? quotationOpenedEvents.map((_, index) => index + 1)
      : [0]
    quotationOpenedLabels.value = quotationOpenedEvents.length
      ? quotationOpenedEvents.map((event) => formatSparklineDate(event.created_at))
      : ['Sin aperturas']

    sectionCounts.value = buildSectionCounts(events)
    latestInteraction.value = events.reduce((latest, event) => {
      if (!event?.created_at || (latest?.created_at && new Date(event.created_at) <= new Date(latest.created_at))) {
        return latest
      }

      return event
    }, null)

    contactStats.value = contactsEvents.map((contact) => {
      const contactId = getContactId(contact)
      const eventsByContact = Array.isArray(contact.events) ? contact.events : []
      const contactSectionCounts = buildSectionCounts(eventsByContact)
      const visitedTrackedSections = contactSectionCounts.filter((item) => trackedSections.includes(item.section))

      return {
        id: contactId,
        name: getContactName(contact),
        company: contact?.company ?? contact?.empresa ?? '',
        quotationOpenedCount: eventsByContact.filter((event) => event?.event_name === 'quotation_opened').length,
        sectionCounts: contactSectionCounts,
        totalInteractions: eventsByContact.length,
        contentCoverage: Math.round((visitedTrackedSections.length / trackedSections.length) * 100),
        visitedSectionCount: visitedTrackedSections.length,
      }
    })
    topInteractingContact.value = [...contactStats.value]
      .sort((first, second) => second.totalInteractions - first.totalInteractions)[0] ?? null
  } catch (error) {
    errorMessage.value = error.response?.data?.message || error.message || 'No se pudo cargar la actividad de la cotización.'
  } finally {
    loading.value = false
  }
}

onMounted(loadEventSummary)
</script>

<template>
  <v-container class="quotation-event-details-view pa-6" fluid>
    <div class="d-flex align-center mb-6">
      <v-btn class="mr-3" icon="mdi-arrow-left" title="Volver" variant="text" @click="router.push({ name: 'quotation-events' })" />
      <div>
        <h1 class="text-h4">Actividad de cotización #{{ quotation?.number ?? quotationId }}</h1>
        <p class="text-medium-emphasis mt-1">{{ quotation?.company ?? 'Cargando cotización...' }}</p>
      </div>
    </div>

    <v-progress-linear v-if="loading" class="mb-4" color="primary" indeterminate />
    <v-alert v-if="errorMessage" class="mb-4" type="error">{{ errorMessage }}</v-alert>

    <template v-else-if="quotation">
      <v-row class="mb-2">
        <v-col cols="12" md="4">
          <v-card class="summary-card h-100" variant="elevated">
            <v-card-item prepend-icon="mdi-fire">
              <v-card-subtitle>Sección de mayor interés</v-card-subtitle>
              <v-card-title>{{ sectionCounts.length ? formatSectionName(sectionCounts[0].section) : 'Sin datos' }}</v-card-title>
            </v-card-item>
            <v-card-text>{{ sectionCounts.length ? `${sectionCounts[0].count} aperturas` : 'Aún no se han abierto secciones.' }}</v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="4">
          <v-card class="summary-card h-100" variant="elevated">
            <v-card-item prepend-icon="mdi-clock-outline">
              <v-card-subtitle>Última interacción</v-card-subtitle>
              <v-card-title>{{ formatDate(latestInteraction?.created_at) }}</v-card-title>
            </v-card-item>
            <v-card-text>{{ latestInteraction?.event_name || 'Sin eventos registrados' }}</v-card-text>
          </v-card>
        </v-col>
        <v-col cols="12" md="4">
          <v-card class="summary-card h-100" variant="elevated">
            <v-card-item prepend-icon="mdi-account-star-outline">
              <v-card-subtitle>Contacto con más interacciones</v-card-subtitle>
              <v-card-title>{{ topInteractingContact?.name || 'Sin datos' }}</v-card-title>
            </v-card-item>
            <v-card-text>{{ topInteractingContact ? `${topInteractingContact.totalInteractions} interacciones` : 'Aún no hay actividad de contactos.' }}</v-card-text>
          </v-card>
        </v-col>
      </v-row>

      <v-row>

        <v-col>
          <v-card class="mb-6" variant="elevated">
            <v-card-title>Aperturas de la cotización</v-card-title>
            <v-card-text>
              <div class="opening-chart">
                <div class="opening-sparkline-summary d-flex align-center justify-space-between mb-2">
                  <span>Veces que los contactos abrieron esta cotización</span>
                  <v-chip variant="flat" color="secondary" size="large">{{ quotationOpenedCount }}</v-chip>
                </div>
                <v-sparkline
                  :gradient="['#1976d2', '#26a69a']"
                  :labels="quotationOpenedLabels"
                  :model-value="quotationOpenedSeries"
                  auto-draw
                  color="primary"
                  fill
                  gradient-direction="top"
                  height="90"
                  label-size="10"
                  line-width="2"
                  padding="16"
                  smooth="8"
                />
                <div class="opening-count">{{ quotationOpenedCount }}</div>
                <div class="opening-bar-track">
                  <div class="opening-bar-fill" :class="{ 'has-value': quotationOpenedCount }" />
                </div>
                <span>Veces que los contactos abrieron esta cotización</span>
              </div>
            </v-card-text>
          </v-card>
        </v-col>

        <v-col>
          <v-card variant="elevated">
            <v-card-title>Aperturas por sección</v-card-title>
            <v-card-text>
              <div v-if="sectionCounts.length" class="section-chart">
                <div v-for="item in sectionCounts" :key="item.section" class="section-chart-row">
                  <span class="section-name">{{ formatSectionName(item.section) }}</span>
                  <div class="section-bar-track">
                    <div class="section-bar-fill" :style="{ width: `${(item.count / maxSectionCount) * 100}%` }" />
                  </div>
                  <strong>{{ item.count }}</strong>
                </div>
              </div>
              <v-empty-state
                v-else
                headline="Sin aperturas de secciones"
                icon="mdi-chart-bar"
                text="Aún no se han registrado aperturas de secciones para esta cotización."
              />
            </v-card-text>
          </v-card>
        </v-col>

      </v-row>

      <section class="mt-6">
        <h2 class="text-h5 mb-4">Actividad por contacto</h2>
        <v-row v-if="contactStats.length">
          <v-col v-for="contact in contactStats" :key="contact.id" cols="12" md="6" lg="4">
            <v-card class="contact-stat-card h-100" variant="elevated">
              <v-card-title>{{ contact.name }}</v-card-title>
              <v-card-subtitle>{{ contact.company || 'Sin empresa' }}</v-card-subtitle>
              <v-card-text>
                <div class="contact-opening-count">
                  <span>Aperturas de cotización</span>
                  <v-chip variant="flat" color="secondary" size="large">{{ contact.quotationOpenedCount }}</v-chip>
                </div>
                <v-divider class="my-4" />
                <div class="d-flex align-center justify-space-between mb-2">
                  <strong class="text-body-2">Cobertura de contenido</strong>
                  <strong>{{ contact.contentCoverage }}%</strong>
                </div>
                <v-progress-linear
                  :model-value="contact.contentCoverage"
                  color="primary"
                  height="8"
                  rounded
                />
                <span class="text-caption text-medium-emphasis d-block mt-2">
                  {{ contact.visitedSectionCount }} de {{ trackedSections.length }} secciones visitadas
                </span>
                <v-divider class="my-4" />
                <strong class="text-body-2">Aperturas por sección</strong>
                <div v-if="contact.sectionCounts.length" class="contact-section-counts mt-3">
                  <div v-for="item in contact.sectionCounts" :key="item.section" class="d-flex justify-space-between ga-3">
                    <span>{{ formatSectionName(item.section) }}</span>
                    <strong>{{ item.count }}</strong>
                  </div>
                </div>
                <span v-else class="text-caption text-medium-emphasis d-block mt-3">Sin aperturas de secciones.</span>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
        <v-empty-state
          v-else
          headline="Sin contactos"
          icon="mdi-account-group-outline"
          text="Esta cotización no tiene contactos asociados."
        />
      </section>
    </template>
  </v-container>
</template>

<style scoped>
.quotation-event-details-view {
  min-height: 100vh;
}

.summary-card :deep(.v-card-title) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.opening-chart {
  display: grid;
  gap: 10px;
  max-width: 520px;
}

.opening-sparkline-summary strong {
  color: white;
  font-size: 1.75rem;
}

.opening-chart > .opening-count,
.opening-chart > .opening-bar-track,
.opening-chart > span {
  display: none;
}

.opening-count {
  color: rgb(var(--v-theme-primary));
  font-size: 3rem;
  font-weight: 700;
  line-height: 1;
}

.opening-bar-track,
.section-bar-track {
  overflow: hidden;
  border-radius: 999px;
  background: rgb(var(--v-theme-surface-variant));
}

.opening-bar-track {
  height: 20px;
}

.opening-bar-fill {
  width: 0;
  height: 100%;
  background: rgb(var(--v-theme-primary));
}

.opening-bar-fill.has-value {
  width: 100%;
}

.section-chart {
  display: grid;
  gap: 16px;
}

.section-chart-row {
  display: grid;
  grid-template-columns: minmax(130px, 200px) 1fr 40px;
  gap: 12px;
  align-items: center;
}

.section-name {
  font-weight: 600;
}

.section-bar-track {
  height: 16px;
}

.section-bar-fill {
  height: 100%;
  min-width: 4px;
  border-radius: inherit;
  background: rgb(var(--v-theme-primary));
}

.contact-opening-count {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.contact-opening-count strong {
  color: white;
  font-size: 1.75rem;
}

.contact-section-counts {
  display: grid;
  gap: 8px;
}

@media (max-width: 600px) {
  .section-chart-row {
    grid-template-columns: 1fr 36px;
  }

  .section-bar-track {
    grid-column: 1 / -1;
    grid-row: 2;
  }
}
</style>
