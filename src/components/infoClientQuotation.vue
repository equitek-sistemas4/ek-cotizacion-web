<script setup>
import { ref } from 'vue'
import logoUrl from '@/assets/logo.png'
import conditionsQuotationComponent from '@/components/conditionsQuotationComponent.vue'
import equipmentQuotationComponent from '@/components/equipmentQuotationComponent.vue'
import infoQuotationComponent from '@/components/infoQuotationComponent.vue'
import linksQuotationComponent from '@/components/linksQuotationComponent.vue'
import productsQuotationComponent from '@/components/productsQuotationComponent.vue'

defineProps({
  loading: { type: Boolean, default: false },
  errorMessage: { type: String, default: '' },
  chatTitle: { type: String, default: 'Chat' },
  contactName: { type: String, default: 'Contacto' },
  quotationId: { type: [Number, String], default: null },
  accessToken: { type: String, default: '' },
})

const activeTab = ref('inicio')
</script>

<template>
  <div class="client-quotation-page">
    <header class="client-quotation-header">
      <div class="header-brand">
        <img alt="Equitek" class="brand-logo" :src="logoUrl" />
        <span>Equitek</span>
      </div>

      <v-tabs
        v-model="activeTab"
        class="quotation-tabs"
        color="primary"
        density="comfortable"
        show-arrows
      >
        <v-tab value="inicio">
          <v-icon class="tab-icon" icon="mdi-home"></v-icon>
          Inicio
        </v-tab>
        <v-tab value="equipos">
          <v-icon class="tab-icon" icon="mdi-laptop"></v-icon>
          Equipos
        </v-tab>
        <v-tab value="productos">
          <v-icon class="tab-icon" icon="mdi-file-check"></v-icon>
          Productos
        </v-tab>
        <v-tab value="precios">
          <v-icon class="tab-icon" icon="mdi-tag"></v-icon>
          Precios
        </v-tab>
        <v-tab value="alcances">
          <v-icon class="tab-icon" icon="mdi-target"></v-icon>
          Alcances
        </v-tab>
        <v-tab value="ligas">
          <v-icon class="tab-icon" icon="mdi-link"></v-icon>
          Ligas
        </v-tab>
      </v-tabs>
    </header>

    <div class="client-portal-content">
      <v-alert v-if="errorMessage" class="portal-error" type="error" variant="tonal">
        {{ errorMessage }}
      </v-alert>

      <info-quotation-component
        v-else-if="activeTab === 'inicio'"
        :access-token="accessToken"
        :quotation-id="41083"
      />

      <conditions-quotation-component
        v-else-if="activeTab === 'condiciones'"
        :access-token="accessToken"
        :quotation-id="41083"
      />

      <equipment-quotation-component
        v-else-if="activeTab === 'equipos'"
        :access-token="accessToken"
        :quotation-id="41083"
      />

      <products-quotation-component
        v-else-if="activeTab === 'productos'"
        :access-token="accessToken"
        :quotation-id="41083"
      />

      <links-quotation-component v-else-if="activeTab === 'ligas'" />

      <section v-else class="client-information">
        <span class="information-label">{{ activeTab }}</span>
        <strong>Información disponible próximamente.</strong>
      </section>

      <section v-if="loading && activeTab !== 'inicio'" class="client-information">
        <span class="information-label">Contacto</span>
        <strong>{{ contactName }}</strong>
      </section>
    </div>
  </div>
</template>

<style scoped>
.client-quotation-page {
  margin: -24px -24px 0;
}

.client-quotation-header {
  border-bottom: 1px solid rgb(var(--v-theme-border));
  border-radius: 10px;
  background: rgb(var(--v-theme-surface));
}

.header-brand,
.quotation-tabs {
  width: 100%;
}

.header-brand {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 24px 12px;
  color: rgb(var(--v-theme-textPrimary));
  font-size: 1.2rem;
  font-weight: 700;
}

.brand-logo {
  width: 36px;
  height: 36px;
  object-fit: contain;
}

.quotation-tabs {
  min-height: 48px;
}

.quotation-tabs :deep(.v-slide-group__content) {
  justify-content: center;
}

.tab-icon {
  margin-right: 8px;
}

.client-portal-content {
  width: min(100%, 1024px);
  margin: 0 auto;
  padding: 64px 0px 0px;
}

.portal-eyebrow,
.information-label {
  margin: 0;
  color: rgb(var(--v-theme-primary));
  font-size: 0.84rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.client-portal-content h1 {
  margin: 8px 0 0;
  color: rgb(var(--v-theme-textPrimary));
  font-size: clamp(1.6rem, 4vw, 2.3rem);
  line-height: 1.2;
}

.portal-description {
  max-width: 620px;
  margin: 12px 0 0;
  color: rgb(var(--v-theme-textMuted));
}

.portal-error,
.client-information {
  max-width: 620px;
  margin-top: 28px;
}

.client-information {
  display: grid;
  gap: 6px;
  padding: 20px;
  border: 1px solid rgb(var(--v-theme-border));
  border-radius: 8px;
  background: rgb(var(--v-theme-surface));
  color: rgb(var(--v-theme-textPrimary));
}

@media (max-width: 700px) {
  .header-brand,
  .quotation-tabs {
    width: 100%;
  }

  .client-quotation-page {
    margin: -16px -16px 0;
  }

  .header-brand {
    padding: 14px 16px 10px;
  }

  .quotation-tabs :deep(.v-slide-group__content) {
    padding: 0 8px;
  }
}
</style>
