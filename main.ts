import { createApp } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'
import { routes } from 'vue-router/auto-routes'

import './style.css'

import App from './src/App.vue'

// vue app
const app = createApp(App)

const router = createRouter({
  history: createWebHistory('/'),
  strict: true,
  routes,
})
app.use(router)
app.mount('#app')
