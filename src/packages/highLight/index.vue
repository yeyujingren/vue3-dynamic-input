<template>
  <div class="dynamic-input-wrapper">
    <div
      @input="inputChangeHanler"
      @focus="focusHandler"
      @blur="blurHandler"
      @paste="pasteHandler"
      :contenteditable="!disabled"
      :class="disabled ? 'disabled edit-wrap' : 'edit-wrap'"
      ref="editor"
    />
    <selection
      :options="options"
      :list-visible="listVisible"
      :cur-selection-position="curSelectionPosition"
      :opt-val-name="optValName"
      :opt-label-name="optLabelName"
    />
  </div>
</template>

<script >
import { createHighLightNode, createTextNode } from '../../utils';
import Selection from './selection.vue';
export default {
  props: {
    options: {
      required: true,
      type: Array
    },
    optValName: {
      type: String,
      default: 'value'
    },
    optLabelName: {
      type: String,
      default: 'label'
    },
    symbolWord: {
      type: String,
      default: '@'
    },
    disabled: {
      type: Boolean,
      default: false
    },
    modelValue: {
      type: String
    }
  },
  emits: ['update:modelValue'],
  components: {
    Selection
  },
  data() {
    return {
      curSelectionPosition: {},
      listVisible: false,
      selection: window.getSelection(),
      blur: false,
      isFirst: true,
      position: null
    };
  },
  created() {
    document.addEventListener('click', this.closeSelectHandler, false);
  },
  destroyed() {
    document.removeEventListener('click', this.closeSelectHandler);
  },
  watch: {
    blur: {
      handler(val) {
        if (val) {
          this.$emit('blur', this.$refs.editor.innerHTML);
        }
      },
      immediate: true
    },
    // fix：http://lucp.lkcoffee.com/test/Bug-59172
    value: {
      handler(val) {
        if (this.isFirst && val) {
          this.isFirst = false;
          this.$nextTick(() => {
            this.$refs.editor.innerHTML = val;
          });
        };
        this.$nextTick(() => {
          this.setSelectionPostion();
        });
      },
      immediate: true,
      deep: true
    }
  },
  methods: {
    /** 复制触发 */
    pasteHandler(ev) {
      ev.stopPropagation();
      ev.preventDefault();
      const classExp = /dynamic-wrapper/;

      let copyData = ev.clipboardData.getData('text/html');
      // 默认html具有更高优先级，因为html中肯定能拿到所有文本
      // 但是text中不一定能拿到全部的特征数据如高亮模块
      if (!copyData) {
        copyData = ev.clipboardData.getData('text');
      }


      const selection = window.getSelection();
      if (!selection.isCollapsed) {
        selection.deleteFromDocument();
      }
      const { startContainer } = selection.getRangeAt(0);


      const range = document.createRange();
      let fragment = range.createContextualFragment(copyData);
      // console.log(fragment.childNodes);
      // let innerHTML = '';
      const fragment_test = document.createDocumentFragment();
      for (let i = 0; i < fragment.childNodes.length; i++) {
        // 复制模板中有用数据仅为span标签（因为@高亮模块也是span标签）， 故span标签即为目标字段
        const curNode = fragment.childNodes[i];
        if (curNode.nodeName === 'SPAN') {
          const curNodeText = curNode.innerText;
          // 根据标签上是否存在约定className，判断是否是@高亮模块
          if (classExp.test(curNode?.className)) {
            fragment_test.appendChild(createHighLightNode(curNodeText, false));
            // innerHTML += `<span class="dynamic-wrapper" contenteditable="false">${curNodeText}</span>`;
          } else {
            // innerHTML += curNodeText;
            fragment_test.appendChild(createTextNode(curNodeText));
          }
        } else if (curNode.nodeName === '#text') {
          // 由于windows下的粘贴板格式会有换行标识，因此需要剔除掉相应的换行符号，保证数据的一致性
          // https://docs.microsoft.com/en-us/windows/win32/dataxchg/html-clipboard-format
          // 仅匹配纯换行的文本节点
          const exp = /^(\n)*$/g;
          if (!exp.test(curNode.data)) {
            // innerHTML += curNode.data;
            fragment_test.appendChild(createTextNode(curNode.data));
          };
        }
      }

      fragment = null;

      if (selection.isCollapsed) {
        // 并未选择范围，只是文本节点中间插入
        const referenceNode = startContainer;
        const parentNode = ev.target;
        const endOffset = selection.anchorOffset;
        const p1 = referenceNode.data.slice(0, endOffset - 1);
        const p2 = referenceNode.data.slice(endOffset);
        referenceNode.data = p1;
        if (!p2) {
        // 末尾插入
          parentNode.insertBefore(fragment_test, referenceNode.nextSibling);
        } else {
          // 其他位置插入
          const nextTextNode = createTextNode(p2);
          parentNode.insertBefore(fragment_test, referenceNode.nextSibling);
          parentNode.insertBefore(nextTextNode, fragment_test.nextSibling);
        }
      } else {
        // 替换选区
        if (startContainer === ev.target) {
          // 相等，则标识删除的是一个ele节点，此时offSet标记的即为节点数
          // ev.target.childNodes[selection.anchorOffset];
          ev.target.insertBefore(fragment_test, ev.target.childNodes[selection.anchorOffset]);
        } else {
          ev.target.insertBefore(fragment_test, startContainer.nextSibling);
        }
      }

      // 合并文本节点，删除空节点
      ev.target.normalize();

      // 因为在开始的时候已经取消掉了默认事件，所以不再会触发input事件，因此，需要手动触发。
      // 以保证及时进行校验
      const event = new Event('input');
      ev.target.dispatchEvent(event);
      this.$nextTick(() => {
        ev.target?.focus();
        const range = document.createRange();
        range.selectNodeContents(ev.target);
        this.selection.removeAllRanges();
        this.selection.addRange(range);
        this.selection.collapseToEnd();
      });
    },

    /**
     * 点击列表项之后插入到当前光标位置
     */
    clickOptionHandler(item) {
      const node = createHighLightNode(item[this.optLabelName]);
      // 当前光标所在选区
      const referenceNode = this.position.startContainer;
      // 获取当前选区的父节点方便后续字符插入
      const parentNode = referenceNode.parentNode;
      // 获取当前光标所在的位置（@符号之后的位置）
      // 首先，我们需要删除掉已经键入的@符号（高亮模块已经添加）
      // 其次，因为我们的@模块插入有两种可能：
      // a、在末尾插入：此时我们只需要删除末尾@符号即可
      // b、在其他地方插入： 此时我们需要将文本节点分割成两份，并在其中间插入高亮模块即可
      const endOffset = this.position.endOffset;
      const p1 = referenceNode.data.slice(0, endOffset - 1);
      const p2 = referenceNode.data.slice(endOffset);
      referenceNode.data = p1;
      if (!p2) {
        // 末尾插入
        parentNode.insertBefore(node, referenceNode.nextSibling);
      } else {
        // 其他位置插入
        const nextTextNode = createTextNode(p2);
        parentNode.insertBefore(node, referenceNode.nextSibling);
        parentNode.insertBefore(nextTextNode, node.nextSibling);
      }

      // 手动触发事件，防止v-modal监听数据和展示数据不一致
      // 因为此时已经手动插入了高亮模块，但是input不会监听到
      const event = new Event('input');
      parentNode.dispatchEvent(event);
      // 重置光标到高亮模块之后
      this.$nextTick(() => {
        const range = document.createRange();
        range.collapse(false);
        range.selectNode(node);
        this.selection.removeAllRanges();
        this.selection.addRange(range);
        this.selection.collapseToEnd();
      });
    },

    /**
     * 输入框变更
     */
    inputChangeHanler(val) {
      // const exp = /<[^>.]*>([^<.]*)<\/[^>.]*>/g;
      const { data, target } = val;
      const curActiveEle = target;

      // 判断
      if (data === this.symbolWord) {
        this.openSelectHandler();
      } else {
        // 其他情况list框重置为隐藏
        this.closeSelectHandler();
      }
      // 保存当前光标的位置，用于后续光标重新定位。如果重新获取可能导致光标位置丢失
      const position = this.selection.getRangeAt(0);
      this.position = position;
      this.$emit('update', curActiveEle.innerHTML);
    },

    /**
     * 获取真实偏移量
     */
    getRealOffset(baseOffset, baseNode, ele) {
      const nodes = ele.childNodes;
      let offset = baseOffset;
      // 遍历父节点下的所有节点，直到找到输入@对应的锚节点,记下标为n，
      // 则realOffset = sum(i.length) + offset; i 属于 [0, n-1]
      for (const i of nodes) {
        if (i !== baseNode) {
          const nodeType = i.nodeType;
          if (nodeType === 3) {
            // text 节点
            offset += i.length;
          } else {
            offset += i.innerText.length || 0;
          }
        } else {
          break;
        }
      }
      return offset;
    },

    /**
     * 设置下拉框位置
     */
    setSelectionPostion() {
      // v0.1.2 更新： 取消之前通过字符长度来定位下拉框位置，采用获取编辑框位置来直接设置下拉框位置
      // 以防止出现文案超长换行之后，通过获取偏移量确定下拉框位置异常问题
      const { top, left, width, height } = this.$refs.editor.getBoundingClientRect();
      const scrollTop = document.documentElement.scrollTop;
      this.curSelectionPosition = {
        top: top + scrollTop + height,
        left,
        width
      };
    },

    /**
     * 关闭选择框
     */
    closeSelectHandler() {
      this.listVisible = false;
    },

    /**
     * 打开选择框
     */
    openSelectHandler() {
      this.listVisible = true;
    },

    blurHandler() {
      this.blur = true;
    },

    focusHandler() {
      // 首次编辑如果框内并没有内容，此时也会触发手动变更innerHTML的情况，会导致光标位置异常，
      // 因此编辑时，需要将标识设置为false
      this.isFirst = false;
      this.blur = false;
    }
  }
};
</script>

<style lang="less" scoped>
.is-windows {
  /* width */
  ::-webkit-scrollbar {
    width: 5px;
    height: 5px;
  }

  /* Track */
  ::-webkit-scrollbar-track {
    background: rgba(0, 0, 0, 0);
  }

  /* Handle */
  ::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.3);
  }

  /* Handle on hover */
  ::-webkit-scrollbar-thumb:hover {
    background: rgb(153, 152, 152);
  }
}
.link {
  color: #536ec2;
  cursor: pointer;
}
.dynamic-input-wrapper {
  position: relative;
  width: 100%;
}
.edit-wrap {
  box-sizing: border-box;
  width: 100%;
  height: 32px;
  padding: 0 15px;
  overflow-y: auto;
  font-size: 13px;
  line-height: 30px;
  text-align: left;
  border: 1px solid #dcdfe6;
  border-radius: 2px;
  outline: none;
  &.disabled {
    background-color: #F5F7FA;
  }
  &:focus {
    border-color: #409eff;
  }
  &:focus-visible {
    border-color: #409eff;
  }
  /deep/ span {
    color: #409eff;
  }
}
</style>