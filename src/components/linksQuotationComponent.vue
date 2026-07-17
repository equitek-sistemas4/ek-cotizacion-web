<script setup>
const socialLinks = [
  {
    name: 'WhatsApp',
    icon: 'mdi-whatsapp',
    url: 'https://api.whatsapp.com/send?phone=528115012414&text=Hola%2C%20me%20gustar%C3%ADa%20informaci%C3%B3n%20sobre%20los%20equipos%21',
  },
  {
    name: 'Facebook',
    icon: 'mdi-facebook',
    url: 'https://es-la.facebook.com/equitek.packing/',
  },
  {
    name: 'YouTube',
    icon: 'mdi-youtube',
    url: 'https://www.youtube.com/channel/UCmOYDTOXXodUXtkx7ao0fPQ?sub_confirmation=1',
  },
  {
    name: 'LinkedIn',
    icon: 'mdi-linkedin',
    url: 'https://mx.linkedin.com/company/equitek',
  },
  {
    name: 'Instagram',
    icon: 'mdi-instagram',
    url: 'https://www.instagram.com/equitek.packing/',
  },
]

const videos = [
  {
    title: 'Caso de Éxito: Envasadora de Aceites y Lubricantes Automotrices',
    id: 'LUyE7RXxZ9o',
  },
]
</script>

<template>
  <section class="quotation-links">
    <div>
      <p class="links-eyebrow">Equitek</p>
      <h1>Redes sociales y videos</h1>
    </div>

    <div class="social-links">
      <v-btn
        v-for="socialLink in socialLinks"
        :key="socialLink.name"
        :href="socialLink.url"
        :prepend-icon="socialLink.icon"
        rel="noopener"
        target="_blank"
        variant="outlined"
      >
        {{ socialLink.name }}
      </v-btn>
    </div>

    <div class="videos-grid">
      <v-card v-for="video in videos" :key="video.id" variant="outlined">
        <v-card-title>{{ video.title }}</v-card-title>
        <div class="video-container">
          <iframe
            allow="
              accelerometer;
              autoplay;
              clipboard-write;
              encrypted-media;
              gyroscope;
              picture-in-picture;
              web-share;
            "
            allowfullscreen
            :src="`https://www.youtube-nocookie.com/embed/${video.id}`"
            :title="video.title"
          />
        </div>
      </v-card>
    </div>
  </section>
</template>

<style scoped>
.quotation-links {
  display: grid;
  gap: 24px;
}
.links-eyebrow {
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
.social-links {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.videos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
}
.video-container {
  position: relative;
  width: 100%;
  padding-top: 56.25%;
}
.video-container iframe {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border: 0;
}
</style>
