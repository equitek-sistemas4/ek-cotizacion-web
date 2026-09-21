<script setup>
import { computed, ref, watch } from 'vue'
import { getQuotationInfo, getQuotationProducts } from '@/services/quotations'

const props = defineProps({
  quotationId: { type: [Number, String], default: null },
  accessToken: { type: String, default: '' },
})

const loading = ref(false)
const errorMessage = ref('')
const projectCost = ref(0)
const quotationInfo = ref(null)
const prospectInfo = ref(null)
const term = ref(12)
const downPaymentPercent = ref(10)
const monthlyPayment = ref(0)
const products = ref([])
const productionInputs = ref({})
const workingDaysPerMonth = ref(24)
const legacyExpectedMonthlyProduction = ref(0)
const legacyContributionPerUnit = ref(0)
const financingTerms = [12, 18, 24, 36]

const currencyCode = computed(() => {
  const currency = String(quotationInfo.value?.moneda_codigo ?? '').trim().toUpperCase()

  return /^[A-Z]{3}$/.test(currency) ? currency : 'MXN'
})

const formatAmount = (value) => new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
}).format(Number(value) || 0)

const quotationHeading = () => {
  const quotationNumber = quotationInfo.value?.idcoti ?? props.quotationId
  const company = quotationInfo.value?.empresa ?? prospectInfo.value?.empresa

  return company ? `Cotización #${quotationNumber} - ${company}` : `Cotización #${quotationNumber}`
}

const truncateToTwoDecimals = (value) => Math.trunc(value * 100) / 100

const discountPercentage = computed(() => Number(quotationInfo.value?.descuento) || 0)
const discountAmount = computed(() => truncateToTwoDecimals(projectCost.value * (discountPercentage.value / 100)))
const discountedProjectCost = computed(() => truncateToTwoDecimals(projectCost.value - discountAmount.value))
const traditionalPayment = computed(() => truncateToTwoDecimals(discountedProjectCost.value / 2))
const downPayment = computed(() => truncateToTwoDecimals(projectCost.value * (Number(downPaymentPercent.value) / 100)))
const residualValue = computed(() => truncateToTwoDecimals(projectCost.value * 0.01))
const financedAmount = computed(() => truncateToTwoDecimals(projectCost.value - downPayment.value - residualValue.value))
const monthlyReturnOnInvestment = computed(() => truncateToTwoDecimals(monthlyContribution.value - monthlyPayment.value))
const productPresentations = computed(() => products.value.flatMap((product) =>
  (product.Presentacion ?? product.presentaciones ?? []).map((presentation) => ({
    key: `${product.idprod ?? product.id ?? 'product'}-${presentation.idpresen ?? presentation.id ?? presentation.presentacion}`,
    product: product.producto ?? product.nombre ?? product.descripcion ?? 'Producto',
    presentation: `${presentation.presentacion ?? ''} ${presentation.medida ?? ''}`.trim() || '—',
    capacityPerMinute: Number(presentation.produccion) || 0,
  })),
))
const productionRows = computed(() => productPresentations.value.map((presentation) => {
  const input = productionInputs.value[presentation.key] ?? {}
  const hoursPerDay = Number(input.hoursPerDay) || 0
  const monthlyTarget = Number(input.monthlyTarget) || 0
  const contributionPerUnit = Number(input.contributionPerUnit) || 0
  const dailyProduction = presentation.capacityPerMinute * 60 * hoursPerDay
  const requiredDays = dailyProduction > 0 ? monthlyTarget / dailyProduction : 0

  return {
    ...presentation,
    hoursPerDay,
    monthlyTarget,
    contributionPerUnit,
    dailyProduction,
    requiredDays,
    monthlyContribution: monthlyTarget * contributionPerUnit,
  }
}))
const totalRequiredDays = computed(() => productionRows.value.reduce((total, row) => total + row.requiredDays, 0))
const usagePercentage = computed(() => {
  const workingDays = Number(workingDaysPerMonth.value) || 0
  return workingDays > 0 ? (totalRequiredDays.value / workingDays) * 100 : 0
})
const monthlyContribution = computed(() => truncateToTwoDecimals(
  productionRows.value.reduce((total, row) => total + row.monthlyContribution, 0),
))
const annualContribution = computed(() => truncateToTwoDecimals(monthlyContribution.value * 12))
const contributionDuringTerm = computed(() => truncateToTwoDecimals(monthlyContribution.value * (Number(term.value) || 0)))
const roiPercentage = computed(() => (
  projectCost.value > 0 ? (contributionDuringTerm.value / projectCost.value) * 100 : 0
))
const recoveryMonths = computed(() => (
  monthlyContribution.value > 0 ? truncateToTwoDecimals(projectCost.value / monthlyContribution.value) : null
))
const recoveryYears = computed(() => (
  recoveryMonths.value == null ? null : truncateToTwoDecimals(recoveryMonths.value / 12)
))
const legacyMonthlyContribution = computed(() => truncateToTwoDecimals(
  Number(legacyExpectedMonthlyProduction.value || 0) * Number(legacyContributionPerUnit.value || 0),
))
const legacyAnnualContribution = computed(() => truncateToTwoDecimals(legacyMonthlyContribution.value * 12))
const legacyRoiPercentage = computed(() => (
  projectCost.value > 0 ? (legacyAnnualContribution.value / projectCost.value) * 100 : 0
))
const legacyRecoveryMonths = computed(() => (
  legacyMonthlyContribution.value > 0 ? truncateToTwoDecimals(projectCost.value / legacyMonthlyContribution.value) : null
))
const legacyRecoveryYears = computed(() => (
  legacyRecoveryMonths.value == null ? null : truncateToTwoDecimals(legacyRecoveryMonths.value / 12)
))
const legacyMonthlyReturnOnInvestment = computed(() => truncateToTwoDecimals(
  legacyMonthlyContribution.value - monthlyPayment.value,
))
/*const paymentBalance = computed(
  () => financedAmount.value - Number(monthlyPayment.value || 0) * Number(term.value || 0),
)*/

const recalculateMonthlyPayment = () => {
  const months = Number(term.value)
  monthlyPayment.value = months > 0
    ? truncateToTwoDecimals(financedAmount.value / months)
    : 0
}

const loadFinancialData = async () => {
  if (!props.quotationId) {
    projectCost.value = 0
    quotationInfo.value = null
    prospectInfo.value = null
    products.value = []
    productionInputs.value = {}
    errorMessage.value = 'No fue posible identificar la cotización.'
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    const [response, productsResponse] = await Promise.all([
      getQuotationInfo(props.quotationId, { accessToken: props.accessToken }),
      getQuotationProducts(props.quotationId, { accessToken: props.accessToken }),
    ])
    quotationInfo.value = response?.quotation_info ?? null
    prospectInfo.value = response?.quotation_prospect_info ?? null
    projectCost.value = truncateToTwoDecimals(Number(response?.quotation_info?.costo ?? 0) - Number(response?.quotation_info?.extras ?? 0))
    products.value = Array.isArray(productsResponse) ? productsResponse : []
    productionInputs.value = Object.fromEntries(productPresentations.value.map((presentation) => [
      presentation.key,
      { hoursPerDay: 0, monthlyTarget: 0, contributionPerUnit: 0 },
    ]))

    if (!projectCost.value) {
      errorMessage.value = 'No fue posible obtener el valor del proyecto.'
    }
  } catch (error) {
    projectCost.value = 0
    quotationInfo.value = null
    prospectInfo.value = null
    products.value = []
    productionInputs.value = {}
    errorMessage.value = error.message || 'No se pudo obtener el valor del proyecto.'
  } finally {
    loading.value = false
  }
}

watch(() => [props.quotationId, props.accessToken], loadFinancialData, { immediate: true })
watch([projectCost, term, downPaymentPercent], recalculateMonthlyPayment)
</script>

<template>
  <section class="finance-quotation">
    <div v-if="loading" class="finance-state">
      <v-progress-circular color="primary" indeterminate size="32" />
      <span>Cargando información financiera...</span>
    </div>

    <v-alert v-else-if="errorMessage" type="error" variant="tonal">{{ errorMessage }}</v-alert>

    <template v-else>
      <div>
        <p class="finance-eyebrow">{{ quotationHeading() }}</p>
        <h1>Análisis Financiero</h1>
      </div>

      <div>
        <span class="finance-plans-note">
            En Equitek contamos con <strong>planes de financiamiento</strong> mediante arrendamiento puro o leasing,
            <strong>te ayudamos</strong> a diseñar un <strong>plan</strong> de acuerdo a tus necesidades, con un
            <strong>enganche mínimo</strong> y distintas <strong>opciones de plazo.</strong>
        </span>
      </div>

      <v-card v-if="discountPercentage > 0" variant="elevated">
        <v-card-text class="promotion">
          <h3>{{ discountPercentage }}% DE DESCUENTO EN PAGOS DE CONTADO ESQUEMA TRADICIONAL</h3>
          <br/>
          <v-container>
            <v-row>
              <v-col cols="3">
                <h4>Valor del proyecto</h4>
              </v-col>
              <v-col cols="3">
                <h4>{{ discountPercentage }}% descuento</h4>
              </v-col>
              <v-col cols="3">
                <h4>50% anticipo</h4>
              </v-col>
              <v-col cols="3">
                <h4>50% contra aviso de embarque</h4>
              </v-col>
              <v-divider></v-divider>
              <v-col cols="3">
                <span>${{ formatAmount(projectCost) }} {{ currencyCode }}</span>
              </v-col>
              <v-col cols="3">
                <span>-${{ formatAmount(discountAmount) }} {{ currencyCode }}</span>
              </v-col>
              <v-col cols="3">
                <span>${{ formatAmount(traditionalPayment) }} {{ currencyCode }}</span>
              </v-col>
              <v-col cols="3">
                <span>${{ formatAmount(traditionalPayment) }} {{ currencyCode }}</span>
              </v-col>
            </v-row>
          </v-container>
          <p class="finance-note">Montos expresados antes de IVA.</p>
        </v-card-text>
      </v-card>

      <v-card variant="elevated">
        <v-card-text class="finance-content">
          <div class="finance-heading">
            <h2>OPCIÓN DE ARRENDAMIENTO FINANCIERO</h2>
            <p>Hasta 36 meses sin intereses</p>
          </div>

          <div class="finance-controls">
            <v-select
              v-model="term"
              :items="financingTerms"
              hint="Existen opciones de 48 y 60 meses"
              label="Plazo (meses)"
              persistent-hint
              variant="outlined"
            />
            <v-text-field
              v-model.number="downPaymentPercent"
              label="Anticipo (%)"
              max="99"
              min="0"
              suffix="%"
              type="number"
              variant="outlined"
            />
            <v-text-field
              :model-value="formatAmount(monthlyPayment)"
              label="Mensualidad"
              min="0"
              prefix="$"
              readonly
              type="text"
              variant="outlined"
            />
          </div>

          <v-container>
            <v-row>
              <v-col cols="4">
                <h4>Plazo</h4>
              </v-col>
              <v-col cols="4">
                <h4>Anticipo</h4>
              </v-col>
              <v-col cols="4">
                <h4>Mensualidad</h4>
              </v-col>
              <!--<v-col cols="3">
                <h4>Valor residual (1%)</h4>
              </v-col>-->
              <v-divider></v-divider>
              <v-col cols="4">
                {{ term }} meses
              </v-col>
              <v-col cols="4">
                {{ Number(downPaymentPercent) || 0 }}% · ${{ formatAmount(downPayment) }} {{ currencyCode }}
              </v-col>
              <v-col cols="4">
                ${{ formatAmount(monthlyPayment) }} {{ currencyCode }}
              </v-col>
              <!--<v-col cols="3">
                ${{ formatAmount(residualValue) }} {{ currencyCode }}
              </v-col>-->
            </v-row>
          </v-container>

          <p class="finance-note"><strong>Montos expresados antes de IVA.</strong></p>
          <p class="finance-disclaimer">
            Este cálculo es demostrativo y aproximado.
            No se considera % de interés alguno y este depende con la casa financiera con la que se autorice el tramite.
            Si desea aplicar a alguno de los tipos de financiamiento, comuníquelo a su asesor comercial.
          </p>
          <br/>
        </v-card-text>
      </v-card>

      <v-card variant="elevated">
        <v-card-text class="finance-content">
          <div class="finance-heading">
            <h2>ANÁLISIS RETORNO SIMPLE ANUAL SOBRE LA INVERSIÓN</h2>
            <p>Captura las estimaciones mensuales para conocer la recuperación de tu inversión.</p>
          </div>

          <div class="finance-controls finance-controls--roi">
            <v-text-field
              v-if="false"
              v-model.number="workingDaysPerMonth"
              label="Producción mensual estimada"
              min="0"
              suffix="unidades"
              type="number"
              variant="outlined"
            />
            <v-text-field
              v-if="false"
              v-model.number="workingDaysPerMonth"
              hint="Cantidad que se dispone del precio total por unidad del producto para pago de inversión"
              label="Margen de contribucion / Aportacion por unidad de producto"
              min="0"
              persistent-hint
              prefix="$"
              :suffix="currencyCode"
              type="number"
              variant="outlined"
            />
          </div>

          <div class="production-inputs">
            <v-text-field
              v-model.number="workingDaysPerMonth"
              class="working-days-input"
              label="Días laborables por mes"
              min="1"
              suffix="días"
              type="number"
              variant="outlined"
            />

            <div v-for="presentation in productPresentations" :key="presentation.key" class="production-inputs__row">
              <p>{{ presentation.product }} · {{ presentation.presentation }}</p>
              <v-text-field
                v-model.number="productionInputs[presentation.key].hoursPerDay"
                density="comfortable"
                hide-details
                label="Horas diarias"
                min="0"
                suffix="h"
                type="number"
                variant="outlined"
              />
              <v-tooltip
                location="top"
                open-on-hover
                text="Volumen mensual que se espera procesar con el equipo"
              >
                <template #activator="{ props: tooltipProps }">
                  <div v-bind="tooltipProps">
                    <v-text-field
                      v-model.number="productionInputs[presentation.key].monthlyTarget"
                      density="comfortable"
                      hide-details
                      label="Producción mensual estimada"
                      min="0"
                      suffix="unid."
                      type="number"
                      variant="outlined"
                    />
                  </div>
                </template>
              </v-tooltip>
              <v-tooltip
                location="top"
                open-on-click
                open-on-hover
                text="Monto disponible por cada unidad producida para recuperar la inversión o cubrir el pago del equipo."
              >
                <template #activator="{ props: tooltipProps }">
                  <div v-bind="tooltipProps">
                    <v-text-field
                      v-model.number="productionInputs[presentation.key].contributionPerUnit"
                      density="comfortable"
                      hide-details
                      label="Contribución estimada por unidad"
                      min="0"
                      prefix="$"
                      :suffix="currencyCode"
                      type="number"
                      variant="outlined"
                    />
                  </div>
                </template>
              </v-tooltip>
            </div>
          </div>

          <v-alert v-if="!productionRows.length" type="info" variant="tonal">
            No hay presentaciones disponibles para calcular la capacidad de producción.
          </v-alert>

          <div v-else class="production-table">
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Tamaño / presentación</th>
                  <th>Capacidad cotizada<br>(envases/min)</th>
                  <th>Producción diaria</th>
                  <th>Días requeridos</th>
                  <th>Contribución mensual</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in productionRows" :key="row.key">
                  <td>{{ row.product }}</td>
                  <td>{{ row.presentation }}</td>
                  <td>{{ formatAmount(row.capacityPerMinute) }}</td>
                  <td>{{ formatAmount(row.dailyProduction) }}</td>
                  <td>{{ row.requiredDays.toFixed(1) }}</td>
                  <td>${{ formatAmount(row.monthlyContribution) }} {{ currencyCode }}</td>
                </tr>
              </tbody>
              <tfoot>
                <tr>
                  <th colspan="3">Total de días de producción requeridos</th>
                  <th colspan="3">{{ totalRequiredDays.toFixed(1) }}</th>
                  <!-- <th>Total</th>
                  <th>${{ formatAmount(monthlyContribution) }} {{ currencyCode }}</th> -->
                </tr>
                <tr>
                  <th colspan="3">Porcentaje de uso</th>
                  <th colspan="3">{{ usagePercentage.toFixed(2) }}%</th>
                </tr>
              </tfoot>
            </table>
          </div>

          <div class="roi-summary">
            <div><span>Total de inversión</span><h3><strong>${{ formatAmount(projectCost) }} {{ currencyCode }}</strong></h3></div>
            <div><span>Total anticipo</span><h3><strong>${{ formatAmount(downPayment) }} {{ currencyCode }}</strong></h3></div>
            <div><span>Mensualidad</span><h3><strong>${{ formatAmount(monthlyPayment) }} {{ currencyCode }}</strong></h3></div>
            <div><span>Contribución mensual</span><h3><strong>${{ formatAmount(monthlyContribution) }} {{ currencyCode }}</strong></h3></div>
            <div><span>Contribución total en {{ term }} meses</span><h3><strong>${{ formatAmount(contributionDuringTerm) }} {{ currencyCode }}</strong></h3></div>
            <div><span>ROI en periodo de arrendamiento</span><h3><strong>{{ roiPercentage.toFixed(2) }}%</strong></h3></div>
            <div><span>ROI meses</span><h3><strong>{{ recoveryMonths == null ? '—' : recoveryMonths.toFixed(2) }}</strong></h3></div>
            <div><span>Contribución mensual contra arrendamiento</span><h3><strong :class="{ 'monthly-roi-negative': monthlyReturnOnInvestment < 0, 'monthly-roi-positive': monthlyReturnOnInvestment > 0 }">${{ formatAmount(monthlyReturnOnInvestment) }} {{ currencyCode }}</strong></h3></div>
          </div>

            <v-row v-if="false">
              <v-col cols="4">
                <div>
                  <h3>Inversión total: <strong>${{ formatAmount(projectCost) }} {{ currencyCode }}</strong></h3>
                </div>
              </v-col>
              <v-col cols="4">
                <div>
                  <h3>ROI anual estimado: <strong>{{ roiPercentage.toFixed(2) }}%</strong></h3>
                </div>
              </v-col>
              <v-col cols="4">
                <div>
                  <h3>Recuperación estimada: <strong>{{ recoveryMonths == null ? '' : `${recoveryMonths.toFixed(1)} meses` }} / {{ recoveryYears == null ? '' : `${recoveryYears.toFixed(2)} años` }}</strong></h3>
                </div>
              </v-col>
              <v-col cols="6">
                <div>
                  <h3>Margen de contribución mensual: <strong>${{ formatAmount(monthlyContribution) }} {{ currencyCode }}</strong></h3>
                </div>
              </v-col>
              <v-col cols="6">
                <div>
                  <h3>Margen de contribución anual: <strong>${{ formatAmount(annualContribution) }} {{ currencyCode }}</strong></h3>
                </div>
              </v-col>
              <v-col></v-col>
              <v-divider></v-divider>
              <v-col cols="12">
                <div>
                  <h3>
                    Contribución mensual contra arrendamiento mensual:
                    <strong
                      :class="{
                        'monthly-roi-negative': monthlyReturnOnInvestment < 0,
                        'monthly-roi-positive': monthlyReturnOnInvestment > 0,
                      }"
                    >
                      ${{ formatAmount(monthlyReturnOnInvestment) }} {{ currencyCode }}
                    </strong>
                  </h3>
                </div>
              </v-col>
            </v-row>
            <!--<div>
              <span>Recuperación del 100% de la inversión</span>
              <strong>{{ recoveryYears == null ? 'Captura la producción y la aportación por unidad' : `${recoveryYears.toFixed(2)} años` }}</strong>
            </div>-->

        </v-card-text>
      </v-card>

      <v-card variant="elevated">
        <v-card-text class="finance-content">
          <div class="finance-heading">
            <h2>ANÁLISIS RETORNO SIMPLE ANUAL SOBRE LA INVERSIÓN (VERSIÓN ANTERIOR)</h2>
            <p>Captura una estimación global mensual para comparar este cálculo con el análisis por presentación.</p>
          </div>

          <div class="finance-controls finance-controls--roi">
            <v-tooltip
              location="top"
              open-on-hover
              text="Volumen mensual que se espera procesar con el equipo"
            >
              <template #activator="{ props: tooltipProps }">
                <div v-bind="tooltipProps">
                  <v-text-field
                    v-model.number="legacyExpectedMonthlyProduction"
                    label="Producción mensual estimada"
                    min="0"
                    suffix="unidades"
                    type="number"
                    variant="outlined"
                  />
                </div>
              </template>
            </v-tooltip>
            <v-tooltip
              location="top"
              open-on-click
              open-on-hover
              text="Monto disponible por cada unidad producida para recuperar la inversión o cubrir el pago del equipo."
            >
              <template #activator="{ props: tooltipProps }">
                <div v-bind="tooltipProps">
                  <v-text-field
                    v-model.number="legacyContributionPerUnit"
                    label="Contribución estimada por unidad"
                    min="0"
                    prefix="$"
                    :suffix="currencyCode"
                    type="number"
                    variant="outlined"
                  />
                </div>
              </template>
            </v-tooltip>
          </div>

          <div class="roi-summary">
            <div>
              <span>Inversión total</span>
              <strong>${{ formatAmount(projectCost) }} {{ currencyCode }}</strong>
            </div>
            <div>
              <span>ROI anual estimado</span>
              <strong>{{ legacyRoiPercentage.toFixed(2) }}%</strong>
            </div>
            <div>
              <span>Recuperación estimada</span>
              <strong>{{ legacyRecoveryMonths == null ? '—' : `${legacyRecoveryMonths.toFixed(1)} meses / ${legacyRecoveryYears.toFixed(2)} años` }}</strong>
            </div>
            <div>
              <span>Margen de contribución mensual</span>
              <strong>${{ formatAmount(legacyMonthlyContribution) }} {{ currencyCode }}</strong>
            </div>
            <div>
              <span>Margen de contribución anual</span>
              <strong>${{ formatAmount(legacyAnnualContribution) }} {{ currencyCode }}</strong>
            </div>
            <div>
              <span>Contribución mensual contra arrendamiento</span>
              <strong :class="{ 'monthly-roi-negative': legacyMonthlyReturnOnInvestment < 0, 'monthly-roi-positive': legacyMonthlyReturnOnInvestment > 0 }">${{ formatAmount(legacyMonthlyReturnOnInvestment) }} {{ currencyCode }}</strong>
            </div>
          </div>
        </v-card-text>
      </v-card>
      <br/>
    </template>
  </section>
</template>

<style scoped>
.finance-quotation,
.finance-content { display: grid; gap: 24px; }
.finance-state { display: grid; place-items: center; gap: 12px; min-height: 240px; color: rgb(var(--v-theme-textMuted)); }
.finance-eyebrow { margin: 0; color: rgb(var(--v-theme-primary)); font-size: .84rem; font-weight: 700; letter-spacing: .04em; text-transform: uppercase; }
h1 { margin: 8px 0 0; color: rgb(var(--v-theme-textPrimary)); font-size: clamp(1.6rem, 4vw, 2.3rem); line-height: 1.2; }
.finance-plans-card { overflow: hidden; }
.finance-plans-content { padding: 2px 12px 12px; }
.finance-plans-title { padding: 10px 12px; border-radius: 4px; background: rgb(var(--v-theme-primary)); color: white; font-size: clamp(1rem, 2.2vw, 1.3rem); font-weight: 800; line-height: 1.2; text-align: center; }
.finance-benefits { display: grid; grid-template-columns: 1.25fr 1fr .8fr; gap: 16px; max-width: 940px; margin: 12px auto 0; }
.finance-benefits-column { display: grid; align-content: start; gap: 6px; }
.finance-benefits p { display: flex; align-items: center; gap: 8px; margin: 0; color: rgb(var(--v-theme-textPrimary)); font-size: .95rem; }
.equipment-image { max-width: 1040px; margin: 24px auto 16px; }
.finance-plans-note { margin: 0; color: rgb(var(--v-theme-textPrimary)); font-size: .9rem; line-height: 1.6; }
.finance-plans-note span { white-space: nowrap; }
.promotion, .finance-heading { text-align: center; }
.promotion h2, .promotion h3, .finance-heading h2 { margin: 0; color: rgb(var(--v-theme-primary)); font-size: 1.15rem; }
.promotion > p, .finance-heading p { margin: 8px 0 20px; color: rgb(var(--v-theme-textMuted)); }
.finance-controls { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
.finance-controls--roi { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.production-inputs { display: grid; gap: 16px; }
.working-days-input { max-width: 260px; }
.production-inputs__row { display: grid; grid-template-columns: minmax(180px, 1.25fr) repeat(3, minmax(150px, 1fr)); gap: 16px; align-items: center; }
.production-inputs__row p { margin: 0; color: rgb(var(--v-theme-textPrimary)); font-weight: 700; }
.production-table { overflow-x: auto; }
.production-table table { width: 100%; min-width: 760px; border-collapse: collapse; }
.production-table th, .production-table td { border: 1px solid rgb(var(--v-theme-border)); padding: 8px; text-align: right; vertical-align: middle; }
.production-table th { background: rgb(var(--v-theme-surfaceVariant)); color: rgb(var(--v-theme-textPrimary)); font-size: .78rem; line-height: 1.25; }
.production-table td:first-child, .production-table td:nth-child(2), .production-table th:first-child, .production-table th:nth-child(2) { text-align: left; }
.production-table tfoot th { font-weight: 800; }
.production-table :deep(.v-input) { min-width: 110px; }
.roi-summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
.roi-summary > div { display: grid; gap: 4px; padding: 14px; border-radius: 8px; background: rgb(var(--v-theme-surfaceVariant)); }
.roi-summary span { color: rgb(var(--v-theme-textMuted)); font-size: .85rem; }
.roi-summary strong { color: rgb(var(--v-theme-textPrimary)); font-size: 1.05rem; }
.monthly-roi-negative { color: rgb(var(--v-theme-error)); }
.monthly-roi-positive { color: rgb(var(--v-theme-success)); }
.finance-note, .finance-disclaimer { margin: 10px 0 0; text-align: center; color: rgb(var(--v-theme-textMuted)); font-size: .9rem; }
.finance-disclaimer { line-height: 1.5; }
.finance-table { overflow-x: auto; -webkit-overflow-scrolling: touch; }
.finance-table :deep(table) { min-width: 640px; }
.finance-table :deep(th) { color: rgb(var(--v-theme-textPrimary)); font-weight: 700; white-space: normal; }
@media (max-width: 700px) {
  .finance-content { gap: 20px; }
  .finance-controls { grid-template-columns: 1fr; gap: 4px; }
  .finance-controls--roi { grid-template-columns: 1fr; }
  .production-inputs__row { grid-template-columns: 1fr; gap: 8px; }
  .finance-benefits { grid-template-columns: 1fr; gap: 8px; }
  .equipment-image { margin: 20px auto 14px; }
  .finance-plans-note { font-size: .84rem; }
  .finance-plans-note span { white-space: normal; }
  .promotion h3, .finance-heading h2 { font-size: 1rem; line-height: 1.4; }
  .promotion > p, .finance-heading p { margin-bottom: 16px; font-size: .9rem; }
  .finance-note, .finance-disclaimer { font-size: .84rem; }
}
</style>
