import Vue from 'vue'
import store from './store'
import App from './App.vue'
import router from './router'

import './assets/main.css'

new Vue({
  store,
  router,
  render: (h) => h(App)
}).$mount('#app')
