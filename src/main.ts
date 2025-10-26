import { createApp } from 'vue';
import App from './App.vue';
import { createHead } from '@unhead/vue';
import { createPinia } from 'pinia';

createApp(App).use(createHead()).use(createPinia()).mount('body');
