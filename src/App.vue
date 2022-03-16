<script setup>
import { ref } from '@vue/reactivity';
import { watch } from '@vue/runtime-core';
import HighLight from './packages/highLight/index.vue';
let value = ref('');
let options = [
  {
    value: 1,
    label: 'hahah'
  }
]
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
