<script setup>
import { ref, watch } from 'vue'
import { getQuotationProducts } from '@/services/quotations'

const props = defineProps({
  quotationId: { type: [Number, String], default: null },
  accessToken: { type: String, default: '' },
})

const loading = ref(false)
const errorMessage = ref('')
const products = ref([])

const loadProducts = async () => {
  if (!props.quotationId) {
    products.value = []
    errorMessage.value = 'No fue posible identificar la cotización.'
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    const response = await getQuotationProducts(props.quotationId, {
      accessToken: props.accessToken,
    })

    products.value = Array.isArray(response) ? response : []

    if (!products.value.length) {
      errorMessage.value = 'Esta cotización no tiene productos registrados.'
    }
  } catch (error) {
    products.value = []
    errorMessage.value = error.message || 'No se pudieron obtener los productos de la cotización.'
  } finally {
    loading.value = false
  }
}

watch(() => [props.quotationId, props.accessToken], loadProducts, { immediate: true })
</script>

<template>
  <section class="products-quotation">
    <div v-if="loading" class="products-state">
      <v-progress-circular color="primary" indeterminate size="32" />
      <span>Cargando productos de la cotización...</span>
    </div>

    <v-alert v-else-if="errorMessage" type="error" variant="tonal">
      {{ errorMessage }}
    </v-alert>

    <template v-else>
      <div>
        <p class="products-eyebrow">Cotización</p>
        <h1>Productos</h1>
      </div>

      <v-card v-for="product in products" :key="product.idprod" variant="outlined">
        <v-card-title>{{ product.producto }}</v-card-title>
        <v-card-subtitle v-if="product.descripcion">{{ product.descripcion }}</v-card-subtitle>
        <v-card-text>
          <v-table>
            <thead>
              <tr>
                <th>Presentación</th>
                <th>Producción por minuto</th>
                <th>Comentario</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="presentation in product.Presentacion ?? []" :key="presentation.idpresen">
                <td>{{ presentation.presentacion }} {{ presentation.medida }}</td>
                <td>{{ presentation.produccion || 'Sin información' }}</td>
                <td>{{ presentation.comentario || '—' }}</td>
              </tr>
            </tbody>
          </v-table>
        </v-card-text>
      </v-card>
    </template>
  </section>
</template>

<style scoped>
.products-quotation {
  display: grid;
  gap: 24px;
}
.products-state {
  display: grid;
  place-items: center;
  gap: 12px;
  min-height: 240px;
  color: rgb(var(--v-theme-textMuted));
}
.products-eyebrow {
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
</style>
