<script setup>
import { ref, watch } from 'vue'
import { getQuotationInfo } from '@/services/quotations'

const props = defineProps({
  quotationId: { type: [Number, String], default: 41083 },
  accessToken: { type: String, default: '' },
})

const loading = ref(false)
const errorMessage = ref('')
const quotationInfo = ref(null)
const prospectInfo = ref(null)

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === '') {
    return 'Sin información'
  }

  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(Number(value))
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
        <div>
          <p class="portal-eyebrow">Cotización #{{ quotationInfo.idcoti }}</p>
          <h1>{{ quotationInfo.empresa || prospectInfo?.empresa || 'Cotización' }}</h1>
        </div>
        <v-chip color="primary" variant="tonal">
          {{ quotationInfo.estado || 'Sin estado' }}
        </v-chip>
      </div>

      <div class="info-grid">
        <v-card class="info-card" variant="outlined">
          <v-card-title>Información de cotización</v-card-title>
          <v-card-text class="details-list">
            <div>
              <span>Vendedor</span
              ><strong>{{ quotationInfo.vendedor_nombre || quotationInfo.usuario }}</strong>
            </div>
            <div>
              <span>Estatus de venta</span
              ><strong>{{ quotationInfo.estatus_venta || 'Sin información' }}</strong>
            </div>
            <div>
              <span>Costo</span><strong>{{ formatCurrency(quotationInfo.costo) }}</strong>
            </div>
            <div>
              <span>Seguimiento</span
              ><strong>{{ quotationInfo.fecha_seguimiento || 'Sin información' }}</strong>
            </div>
          </v-card-text>
        </v-card>

        <v-card v-if="prospectInfo" class="info-card" variant="outlined">
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

        <v-card v-if="prospectInfo" class="info-card" variant="outlined">
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

      <v-card v-if="prospectInfo?.comentario" class="comments-card" variant="outlined">
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
  align-items: start;
  justify-content: space-between;
  gap: 16px;
}
.quotation-heading h1 {
  margin: 8px 0 0;
  color: rgb(var(--v-theme-textPrimary));
  font-size: clamp(1.6rem, 4vw, 2.3rem);
  line-height: 1.2;
}
.portal-eyebrow {
  margin: 0;
  color: rgb(var(--v-theme-primary));
  font-size: 0.84rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
.info-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}
.info-card,
.comments-card {
  background: rgb(var(--v-theme-surface));
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
}
@media (max-width: 500px) {
  .quotation-heading {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
