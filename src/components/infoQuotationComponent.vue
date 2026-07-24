<script setup>
import { ref, watch } from 'vue'
import { getQuotationInfo, getQuotationEquipment } from '@/services/quotations'

const props = defineProps({
  quotationId: { type: [Number, String], default: 41083 },
  accessToken: { type: String, default: '' },
})

const loading = ref(false)
const errorMessage = ref('')
const quotationInfo = ref(null)
const prospectInfo = ref(null)
const equipmentSummary = ref(null)

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === '') {
    return 'Sin información'
  }

  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(Number(value))
}

const buildEquipmentSummary = (equipments) => {
  if (!Array.isArray(equipments) || equipments.length === 0) {
    return null
  }

  const families = [...new Set(equipments.map((item) => item.familia).filter(Boolean))]
  const models = [...new Set(equipments.map((item) => item.modelo).filter(Boolean))]
  const series = [...new Set(equipments.map((item) => item.serie).filter(Boolean))]
  const totalCost = equipments.reduce((sum, item) => sum + Number(item.costoactual ?? item.costo ?? 0), 0)

  return {
    count: equipments.length,
    totalCost,
    families,
    models,
    series,
  }
}

const loadQuotationInfo = async () => {
  console.log("props.quotationId", props.quotationId)
  if (!props.quotationId) {
    quotationInfo.value = null
    prospectInfo.value = null
    errorMessage.value = 'No fue posible identificar la cotización.'
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    const response = await getQuotationInfo(props.quotationId, {
      accessToken: props.accessToken,
    })

    if (!response?.success && !response?.quotation_info) {
      throw new Error(response?.message || 'No se pudo obtener la información de la cotización.')
    }

    quotationInfo.value = response.quotation_info ?? null
    prospectInfo.value = response.quotation_prospect_info ?? null

    const equipmentResponse = await getQuotationEquipment(props.quotationId, {
      accessToken: props.accessToken,
    })

    equipmentSummary.value = buildEquipmentSummary(Array.isArray(equipmentResponse) ? equipmentResponse : [])
  } catch (error) {
    errorMessage.value = error.message || 'No se pudo obtener la información de la cotización.'
  } finally {
    loading.value = false
  }
}

watch(() => [props.quotationId, props.accessToken], loadQuotationInfo, { immediate: true })
</script>

<template>
  <section class="quotation-info">
    <div v-if="loading" class="quotation-state">
      <v-progress-circular color="primary" indeterminate size="32" />
      <span>Cargando información de la cotización...</span>
    </div>

    <v-alert v-else-if="errorMessage" type="error" variant="tonal">
      {{ errorMessage }}
    </v-alert>

    <template v-else-if="quotationInfo">
      <div class="quotation-heading">
        <div class="quotation-heading-content">
          <p class="portal-eyebrow">Cotización #{{ quotationInfo.idcoti }}</p>
          <h1>{{ quotationInfo.empresa || prospectInfo?.empresa || 'Cotización' }}</h1>
        </div>
        <div class="quotation-status">
          <v-chip color="primary" variant="flat">
            {{ quotationInfo.estado || 'Sin estado' }}
          </v-chip>
          <v-chip class="tracking-chip" color="secondary" prepend-icon="mdi-calendar-clock" variant="flat">
            {{ quotationInfo.fecha_seguimiento || 'Sin información' }}
          </v-chip>
        </div>
      </div>

      <div class="info-grid">
        <v-card v-if="prospectInfo" class="info-card" variant="elevated">
          <v-card-title>Contacto</v-card-title>
          <v-card-text class="details-list">
            <div>
              <span>Nombre</span
              ><strong>{{ prospectInfo.titulo }} {{ prospectInfo.nombre }}</strong>
            </div>
            <div>
              <span>Puesto</span><strong>{{ prospectInfo.funcion || 'Sin información' }}</strong>
            </div>
            <div>
              <span>Correo</span><strong>{{ prospectInfo.correo || 'Sin información' }}</strong>
            </div>
            <div>
              <span>Teléfono</span><strong>{{ prospectInfo.tel || 'Sin información' }}</strong>
            </div>
          </v-card-text>
        </v-card>

        <v-card v-if="prospectInfo" class="info-card" variant="elevated">
          <v-card-title>Empresa</v-card-title>
          <v-card-text class="details-list">
            <div>
              <span>Ubicación</span
              ><strong>{{
                [prospectInfo.ciudad, prospectInfo.estado, prospectInfo.pais]
                  .filter(Boolean)
                  .join(', ') || 'Sin información'
              }}</strong>
            </div>
            <div>
              <span>Rama</span><strong>{{ prospectInfo.rama || 'Sin información' }}</strong>
            </div>
            <div>
              <span>Producto</span><strong>{{ prospectInfo.producto || 'Sin información' }}</strong>
            </div>
            <div>
              <span>Tamaño</span><strong>{{ prospectInfo.tamano || 'Sin información' }}</strong>
            </div>
          </v-card-text>
        </v-card>
      </div>

      <v-card v-if="equipmentSummary" class="equipment-summary-card" variant="elevated">
        <v-card-title>Resumen de equipos</v-card-title>
        <v-card-text>
          <div class="equipment-summary-grid">
            <div>
              <span>Equipos</span>
              <strong>{{ equipmentSummary.count }}</strong>
            </div>
            <div>
              <span>Familias</span>
              <strong>{{ equipmentSummary.families.join(', ') || 'Sin información' }}</strong>
            </div>
            <div>
              <span>Modelos</span>
              <strong>{{ equipmentSummary.models.join(', ') || 'Sin información' }}</strong>
            </div>
            <div class="equipment-summary-full">
              <span>Series</span>
              <strong>{{ equipmentSummary.series.join(', ') || 'Sin información' }}</strong>
            </div>
          </div>
        </v-card-text>
      </v-card>

      <v-card class="quotation-cost" variant="elevated">
        <v-card-text>
          <div>
            <span>Costo total</span>
            <strong>{{ formatCurrency(quotationInfo.costo) }}</strong>
          </div>
          <v-icon icon="mdi-cash-multiple" size="42" />
        </v-card-text>
      </v-card>

      <v-card v-if="prospectInfo?.comentario" class="comments-card" variant="elevated">
        <v-card-title>Comentarios</v-card-title>
        <v-card-text>{{ prospectInfo.comentario }}</v-card-text>
      </v-card>
    </template>
  </section>
</template>

<style scoped>
.quotation-info {
  display: grid;
  gap: 24px;
}
.quotation-state {
  display: grid;
  place-items: center;
  gap: 12px;
  min-height: 240px;
  color: rgb(var(--v-theme-textMuted));
}
.quotation-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  min-height: 250px;
  padding: 32px 36px;
  border-radius: 24px;
  overflow: hidden;
  position: relative;
  background-image: linear-gradient(90deg, rgba(2, 6, 23, 0.82) 0%, rgba(2, 6, 23, 0.4) 60%, rgba(2, 6, 23, 0.24) 100%), url('https://equitek.com.mx/wp-content/uploads/2024/09/PORTADA-EK-bn.jpg');
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}
.quotation-heading::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(0, 0, 0, 0.12) 100%);
  pointer-events: none;
}
.quotation-heading-content {
  position: relative;
  z-index: 1;
  max-width: 70%;
}
.quotation-heading h1 {
  margin: 8px 0 0;
  color: white;
  font-size: clamp(1.6rem, 4vw, 2.3rem);
  line-height: 1.2;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.35);
}
.quotation-status {
  display: flex;
  align-items: end;
  flex-direction: column;
  gap: 8px;
  position: relative;
  z-index: 1;
}
.tracking-chip {
  font-weight: 700;
}
.portal-eyebrow {
  margin: 0;
  color: white;
  font-size: 0.84rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
}
.info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.equipment-summary-card {
  border: 1px solid rgb(var(--v-theme-border));
}
.equipment-summary-card :deep(.v-card-title) {
  font-size: 1rem;
  font-weight: 700;
  color: rgb(var(--v-theme-textPrimary));
}
.equipment-summary-card :deep(.v-card-text) {
  padding-top: 0;
}
.equipment-summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}
.equipment-summary-grid > div {
  display: grid;
  gap: 4px;
}
.equipment-summary-grid span {
  color: rgb(var(--v-theme-textMuted));
  font-size: 0.8rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.equipment-summary-grid strong {
  color: rgb(var(--v-theme-textPrimary));
  overflow-wrap: anywhere;
}
.quotation-cost {
  overflow: hidden;
  background: rgb(var(--v-theme-primary));
  box-shadow: 0 10px 24px rgb(var(--v-theme-primary) / 0.18);
}
.quotation-cost :deep(.v-card-text) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 20px 24px;
}
.quotation-cost span {
  display: block;
  color: white;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.quotation-cost strong {
  display: block;
  margin-top: 4px;
  color: white;
  font-size: 35px;
  line-height: 1.15;
}
.quotation-cost :deep(.v-icon) {
  color: green;
}
.details-list {
  display: grid;
  gap: 14px;
}
.details-list div {
  display: grid;
  gap: 3px;
}
.details-list span {
  color: rgb(var(--v-theme-textMuted));
  font-size: 0.8rem;
}
.details-list strong {
  color: rgb(var(--v-theme-textPrimary));
  overflow-wrap: anywhere;
}
.comments-card :deep(.v-card-text) {
  white-space: pre-line;
}
@media (max-width: 850px) {
  .info-grid {
    grid-template-columns: 1fr;
  }
  .equipment-summary-grid {
    grid-template-columns: 1fr;
  }
}
@media (max-width: 500px) {
  .quotation-heading {
    align-items: stretch;
    flex-direction: column;
    min-height: 320px;
    padding: 24px 20px;
  }
  .quotation-heading-content {
    max-width: 100%;
  }
  .quotation-status {
    align-items: start;
  }
}
</style>
