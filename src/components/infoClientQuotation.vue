<script setup>
import { ref } from 'vue'
import logoUrl from '@/assets/Equitek_Logo.webp'
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
const mobileTabsMenu = ref(false)
</script>

<template>
  <div class="client-quotation-page">
    <header class="client-quotation-header">
      <div class="header-brand">
        <img alt="Equitek" class="brand-logo" :src="logoUrl" />
      </div>

      <v-tabs
        v-model="activeTab"
        class="quotation-tabs"
        color="white"
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

      <div class="mobile-tabs-menu">
        <v-menu v-model="mobileTabsMenu" location="bottom end">
          <template #activator="{ props }">
            <v-btn
              v-bind="props"
              aria-label="Abrir secciones de la cotizaciÃ³n"
              color="secondary"
              icon="mdi-menu"
              variant="text"
            />
          </template>

          <v-list density="compact" min-width="190" nav>
            <v-list-item
              prepend-icon="mdi-home"
              title="Inicio"
              @click="activeTab = 'inicio'; mobileTabsMenu = false"
            />
            <v-list-item
              prepend-icon="mdi-laptop"
              title="Equipos"
              @click="activeTab = 'equipos'; mobileTabsMenu = false"
            />
            <v-list-item
              prepend-icon="mdi-file-check"
              title="Productos"
              @click="activeTab = 'productos'; mobileTabsMenu = false"
            />
            <v-list-item
              prepend-icon="mdi-tag"
              title="Precios"
              @click="activeTab = 'precios'; mobileTabsMenu = false"
            />
            <v-list-item
              prepend-icon="mdi-target"
              title="Alcances"
              @click="activeTab = 'alcances'; mobileTabsMenu = false"
            />
            <v-list-item
              prepend-icon="mdi-link"
              title="Ligas"
              @click="activeTab = 'ligas'; mobileTabsMenu = false"
            />
          </v-list>
        </v-menu>
      </div>
    </header>

    <div class="client-portal-content">
      <v-alert v-if="errorMessage" class="portal-error" type="error" variant="tonal">
        {{ errorMessage }}
      </v-alert>

      <info-quotation-component
        v-else-if="activeTab === 'inicio'"
        :access-token="accessToken"
        :quotation-id=quotationId
      />

      <conditions-quotation-component
        v-else-if="activeTab === 'condiciones'"
        :access-token="accessToken"
        :quotation-id=quotationId
      />

      <equipment-quotation-component
        v-else-if="activeTab === 'equipos'"
        :access-token="accessToken"
        :quotation-id=quotationId
      />

      <products-quotation-component
        v-else-if="activeTab === 'productos'"
        :access-token="accessToken"
        :quotation-id=quotationId
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
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  border-bottom: 1px solid rgb(var(--v-theme-border));
  background: rgb(var(--v-theme-primary));
}

.header-brand {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 24px;
  color: rgb(var(--v-theme-surface));
  font-size: 1.2rem;
  font-weight: 700;
}

.brand-logo {
  width: 180px;
  height: 180px;
  margin-block: -40px;
  object-fit: contain;
}

.quotation-tabs {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 48px;
}

.mobile-tabs-menu {
  display: none;
}

.quotation-tabs :deep(.v-tab) {
  color: rgb(var(--v-theme-surface)) !important;
}

.quotation-tabs :deep(.tab-icon) {
  color: rgb(var(--v-theme-secondary)) !important;
}

.quotation-tabs :deep(.v-slide-group__prev .v-icon),
.quotation-tabs :deep(.v-slide-group__next .v-icon) {
  color: #d1d5db;
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
  .client-quotation-page {
    margin: -16px -16px 0;
  }

  .header-brand {
    padding: 0 16px;
  }

  .quotation-tabs {
    display: none;
  }

  .mobile-tabs-menu {
    display: block;
    margin-left: auto;
    margin-right: 12px;
  }

  .quotation-tabs :deep(.v-slide-group__content) {
    padding: 0 8px;
  }
}
</style>
