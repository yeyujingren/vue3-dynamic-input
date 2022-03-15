<template>
  <div
    :style="`width: ${curSelectionPosition.width}px; top: ${curSelectionPosition.top}px; left: ${curSelectionPosition.left}px;`"
    :class="listVisible ? 'show model' : 'hidden model'"
  >
    <div :class="isMacLike ? 'select-wrap' : 'is-windows select-wrap'">
      <div class="list-wrap">
        <ul>
          <li
            @click="() => clickOptionHandler(item)"
            :key="item[optValName]"
            v-for="item in options"
          >
            {{ item[optLabelName] }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script>
import { isMacLick } from "../../utils";
export default {
  props: {
    options: {
      required: true,
      type: Array,
    },
    listVisible: {
      required: true,
      type: Boolean,
    },
    curSelectionPosition: {
      required: true,
      type: Object,
    },
    optValName: {
      type: String,
      default: "value",
    },
    optLabelName: {
      type: String,
      default: "label",
    },
  },
  data() {
    return {
      isMacLike: isMacLick(),
    };
  },
  destroyed() {
    this.$el.parentNode.removeChild(this.$el);
  },
  mounted() {
    document.body.appendChild(this.$el);
  },
  methods: {
    clickOptionHandler(item) {
      this.$parent.clickOptionHandler(item);
    },
  },
};
</script>

<style lang="less" scoped>
.model {
  position: absolute;
  z-index: 100;
  background-color: #fff;
  border-radius: 0 0 5px 5px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 10%);
  border: 1px solid #dcdfe6;
  border-top: 0;
  .select-wrap {
    position: relative;
    ul {
      min-height: 50px;
      max-height: 220px;
      overflow: auto;
      background-color: #fff;
      padding-inline-start: 0;
      li {
        padding: 0 20px;
        color: #606266;
        font-size: 14px;
        line-height: 30px;
        text-align: left;
        list-style: none;
        background-color: #fff;
        &:hover {
          background: #f4f7fa;
        }
      }
    }
  }
}
.show {
  display: block;
}
.hidden {
  display: none;
}
</style>
