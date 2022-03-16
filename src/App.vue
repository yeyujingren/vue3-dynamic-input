<script setup>
// This starter template is using Vue 3 <script setup> SFCs
// Check out https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup
import { ref } from '@vue/reactivity';
import { watch } from '@vue/runtime-core';
import HelloWorld from './packages/HelloWorld.vue';
import HighLight from './packages/highLight/index.vue';
let value = ref('');
let options = ref([
  {
    value: 1,
    label: 'hahah'
  }
])
watch(
  () => value.value,
  (v) => {
    console.log(v);
  },
  {
    immediate: true
  }
)
</script>

<template>
  <HighLight
    :options="options"
    v-model="value"
  />
</template>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
