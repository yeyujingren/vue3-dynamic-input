<template>
  <div>
    <button type="primary" @click="handleClick">{{
      `${vTitle}${state.nums}-${staticData}`
    }}</button>
    <ul>
      <li v-for="(item, index) in state.list" :key="index">{{ item }}</li>
    </ul>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, nextTick, onMounted, reactive, ref, watch } from "vue";

interface State {
  nums: number;
  list: Array<string>;
}
export default defineComponent({
  
  setup() {
    const staticData = "static";
    let title = ref("Create");
    const state = reactive<State>({
      nums: 0,
      list: [],
    });
    watch(
      () => state.list.length,
      (v = 0) => {
        state.nums = v;
      },
      {
        immediate: true,
        deep: true,
      }
    );
    const vTitle = computed(() => "-" + title.value + "-");
    function handleClick() {
      if (title.value === "Create") {
        title.value = "Reset";
        state.list.push("小黑");
      } else {
        title.value = "Create";
        state.list.length = 2;
      }
    }

    const getList = () => {
      setTimeout(() => {
        state.list = ["小黄", "小红"];
      }, 2000);
      nextTick(() => {
        console.log("nextTick");
      });
    };

    onMounted(() => {
      getList();
    });
    return {
      staticData,
      state,
      handleClick,
      title,
      vTitle
    }
  },
});
</script>

