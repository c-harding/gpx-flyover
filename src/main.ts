import { createApp } from 'vue';
import App from './App.vue';
import { createHead } from '@unhead/vue';

createApp(App).use(createHead()).mount('body');
