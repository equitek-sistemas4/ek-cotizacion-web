<script setup>
import { ref, watch } from 'vue'
import { getQuotationConditions } from '@/services/quotations'

const props = defineProps({
  quotationId: { type: [Number, String], default: null },
  accessToken: { type: String, default: '' },
})

const loading = ref(false)
const errorMessage = ref('')
const conditions = ref([])

const loadConditions = async () => {
  if (!props.quotationId) {
    conditions.value = []
    errorMessage.value = 'No fue posible identificar la cotización.'
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    const response = await getQuotationConditions(props.quotationId, {
      accessToken: props.accessToken,
    })

    conditions.value = Array.isArray(response) ? response : []

    if (!conditions.value.length) {
      errorMessage.value = 'Esta cotización no tiene condiciones registradas.'
    }
  } catch (error) {
    conditions.value = []
    errorMessage.value = error.message || 'No se pudieron obtener las condiciones de la cotización.'
  } finally {
    loading.value = false
  }
}

watch(() => [props.quotationId, props.accessToken], loadConditions, { immediate: true })
</script>

<template>
  <section class="conditions-quotation">
    <div v-if="loading" class="conditions-state">
      <v-progress-circular color="primary" indeterminate size="32" />
      <span>Cargando condiciones de la cotización...</span>
    </div>

    <v-alert v-else-if="errorMessage" type="error" variant="tonal">
      {{ errorMessage }}
    </v-alert>

    <template v-else>
      <div>
        <p class="conditions-eyebrow">Cotización</p>
        <h1>Condiciones comerciales</h1>
      </div>

      <v-row>
        <v-col cols="8">
          <div class="conditions-list">
            <v-card v-for="condition in conditions" :key="condition.idconds" variant="elevated">
              <v-card-title><strong>{{ condition.tipo }}</strong></v-card-title>
              <v-card-text>
                <p class="condition-description">{{ condition.descripcion }}</p>
                <p v-if="condition.nota" class="condition-note">Nota: {{ condition.nota }}</p>
              </v-card-text>
            </v-card>
          </div>
        </v-col>
        <v-col cols="4">
          <v-card>
            <v-card-title><strong>REFERENCIAS BANCARIAS</strong></v-card-title>
            <v-card-text>
              <span>RFC: EQU-000919-7M3 <br/><br/>
                REFERENCIAS BANCARIAS <br/>
                Beneficiario: EQUITEK, S.A. DE
                C.V. <br/><br/>
                BANCO: BANAMEX Moneda:
                PESOS Sucursal: 4270 Cuenta:
                14554 <br/> Clabe: 0025 8042 7000
                1455 45 <br/><br/>
                BANCO: BANAMEX Moneda:
                DOLARES Sucursal: 4270
                Cuenta: 9000521 <br/> Clabe: 0025
                8042 7090 0052 13 <br/><br/>
                BANCO: BANCOMER Moneda:
                PESOS Sucursal: 003 Cuenta:
                0453297500 <br/> Clabe: 0125 8000
                4532 9750 07 <br/><br/>
                BANCO: BANCOMER Moneda:
                DOLARES Sucursal: 003 Cuenta:
                0114655613 <br/> Clabe: 0125 8000
                1146 5561 32
              </span>
            </v-card-text>
          </v-card>
        </v-col>
      </v-row>
      
    </template>
  </section>
</template>

<style scoped>
.conditions-quotation {
  display: grid;
  gap: 24px;
}
.conditions-list {
  display: grid;
  gap: 16px;
}
.conditions-list :deep(.v-card-title) {
  color: rgb(var(--v-theme-primary));
  font-size: 1rem;
  white-space: normal;
}
.conditions-state {
  display: grid;
  place-items: center;
  gap: 12px;
  min-height: 240px;
  color: rgb(var(--v-theme-textMuted));
}
.conditions-eyebrow {
  margin: 0;
  color: rgb(var(--v-theme-primary));
  font-size: 0.84rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}
h1 {
  margin: 8px 0 0;
  color: rgb(var(--v-theme-textPrimary));
  font-size: clamp(1.6rem, 4vw, 2.3rem);
  line-height: 1.2;
}
.condition-description,
.condition-note {
  margin: 0;
  color: rgb(var(--v-theme-textPrimary));
  line-height: 1.6;
  white-space: pre-line;
}
.condition-note {
  margin-top: 16px;
  color: rgb(var(--v-theme-textMuted));
}
</style>
