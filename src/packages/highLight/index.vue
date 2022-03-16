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
      @click="clickOptionHandler"
    />
  </div>
</template>

<script lang="ts">
import { nextTick, onMounted, onUnmounted, reactive, ref, toRefs, watch } from 'vue';
import { createHighLightNode, createTextNode, postionToEnd } from '../../utils';
import Selection from './selection.vue';

interface State {
  curSelectionPosition: {
    left: number,
    top: number,
    width: number
  },
  listVisible: boolean,
  isBlur: boolean,
  isFirst: boolean,
  position: Range,
  selection: Selection
}

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
  emits: ['update:modelValue', 'blur'],
  components: {
    Selection
  },

  setup(props, {emit}) {
    const state = reactive<State>({
      curSelectionPosition: {
        left: 0,
        top: 0,
        width: 0
      },
      listVisible: false,
      isBlur: false,
      isFirst: true,
      position: null,
      selection: window.getSelection()
    });
    const editor = ref<HTMLDivElement>(null);

     /**
     * 关闭选择框
     */
    function closeSelectHandler() {
      if (state.listVisible) {
        state.listVisible = false;
      }
    }

     /**
     * 设置下拉框位置
     */
    function setSelectionPostion() {
      // v0.1.2 更新： 取消之前通过字符长度来定位下拉框位置，采用获取编辑框位置来直接设置下拉框位置
      // 以防止出现文案超长换行之后，通过获取偏移量确定下拉框位置异常问题
      const { top, left, width, height } = editor.value.getBoundingClientRect();
      const scrollTop = document.documentElement.scrollTop;
      state.curSelectionPosition = {
        top: top + scrollTop + height,
        left,
        width
      };
    }
    /**
     * 打开选择框
     */
    function openSelectHandler() {
      state.listVisible = true;
    }

    function blurHandler() {
      state.isBlur = true;
    }

    function focusHandler() {
      // 首次编辑如果框内并没有内容，此时也会触发手动变更innerHTML的情况，会导致光标位置异常，
      // 因此编辑时，需要将标识设置为false
      state.isFirst = false;
      state.isBlur = false;
    }

    /** 复制触发 */
    function pasteHandler(ev: ClipboardEvent) {
      ev.stopPropagation();
      ev.preventDefault();
      const classExp = /dynamic-wrapper/;

      let copyData = ev.clipboardData.getData('text/html');
      // 默认html具有更高优先级，因为html中肯定能拿到所有文本
      // 但是text中不一定能拿到全部的特征数据如高亮模块
      if (!copyData) {
        copyData = ev.clipboardData.getData('text');
      }

      if (!state.selection.isCollapsed) {
        state.selection.deleteFromDocument();
      }
      const { startContainer } = state.selection.getRangeAt(0);


      const range = document.createRange();
      let fragment = range.createContextualFragment(copyData);
      const fragment_test = document.createDocumentFragment();
      for (let i = 0; i < fragment.childNodes.length; i++) {
        // 复制模板中有用数据仅为span标签（因为@高亮模块也是span标签）， 故span标签即为目标字段
        let curNode = fragment.childNodes[i];
        if (curNode.nodeName === 'SPAN') {
          const curNodeText = (curNode as HTMLSpanElement).innerHTML;
          // 根据标签上是否存在约定className，判断是否是@高亮模块
          if (classExp.test((curNode as HTMLSpanElement)?.className)) {
            fragment_test.appendChild(createHighLightNode(curNodeText, props.symbolWord, false));
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
          if (!exp.test((curNode as Text).data)) {
            // innerHTML += curNode.data;
            fragment_test.appendChild(createTextNode((curNode as Text).data));
          };
        }
      }

      fragment = null;
      const targetEle = ev.target as HTMLDivElement;

      if (state.selection.isCollapsed) {
        // 并未选择范围，只是文本节点中间插入
        const referenceNode = startContainer as Text;
        const parentNode = targetEle;
        const endOffset = state.selection.anchorOffset;
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
        if (startContainer === targetEle) {
          // 相等，则标识删除的是一个ele节点，此时offSet标记的即为节点数
          // ev.target.childNodes[selection.anchorOffset];
          targetEle.insertBefore(fragment_test, targetEle.childNodes[state.selection.anchorOffset]);
        } else {
          targetEle.insertBefore(fragment_test, startContainer.nextSibling);
        }
      }

      // 合并文本节点，删除空节点
      targetEle.normalize();

      // 因为在开始的时候已经取消掉了默认事件，所以不再会触发input事件，因此，需要手动触发。
      // 以保证及时进行校验
      const event = new Event('input');
      ev.target.dispatchEvent(event);
      nextTick(() => {
        targetEle?.focus();
        const range = document.createRange();
        range.selectNodeContents(targetEle);
        state.selection.removeAllRanges();
        state.selection.addRange(range);
        state.selection.collapseToEnd();
      });
    }

    /**
     * 点击列表项之后插入到当前光标位置
     */
    function clickOptionHandler(item: {[k: string]: string}) {
      const node = createHighLightNode(item[props.optLabelName]);
      // 当前光标所在选区
      const referenceNode = state.position.startContainer as Text;
      // 获取当前选区的父节点方便后续字符插入
      const parentNode = referenceNode.parentNode;
      // 获取当前光标所在的位置（@符号之后的位置）
      // 首先，我们需要删除掉已经键入的@符号（高亮模块已经添加）
      // 其次，因为我们的@模块插入有两种可能：
      // a、在末尾插入：此时我们只需要删除末尾@符号即可
      // b、在其他地方插入： 此时我们需要将文本节点分割成两份，并在其中间插入高亮模块即可
      const endOffset = state.position.endOffset;
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
      nextTick(() => {
        postionToEnd(node);
      });
    }

    /**
     * 输入框变更
     */
    function inputChangeHanler(val: InputEvent) {
      const { data, target } = val;
      const curActiveEle = target as HTMLDivElement;

      // 判断
      if (data === props.symbolWord) {
        openSelectHandler();
      } else {
        // 其他情况list框重置为隐藏
        closeSelectHandler();
      }
      // 保存当前光标的位置，用于后续光标重新定位。如果重新获取可能导致光标位置丢失
      state.position = state.selection.getRangeAt(0);
      emit('update:modelValue', curActiveEle.innerHTML);
    }

    onMounted(() => {
      document.addEventListener('click', closeSelectHandler, false);
    });
    onUnmounted(() => {
      document.removeEventListener('click', closeSelectHandler);
    })

    watch(
      () => state.isBlur,
      (val) => {
        if (val) {
          emit('blur', editor.value.innerHTML);
        }
        nextTick(() => {
          setSelectionPostion()
        })
      },
      {
        immediate: true
      }
    );
    watch(
      () => props.modelValue,
      (v) => {
        if (state.isFirst && v) {
          state.isFirst = false;
          nextTick(() => {
            editor.value.innerHTML = v;
          })
        }
      }
    )

    return {
      ...toRefs(state),
      editor,
      openSelectHandler,
      blurHandler,
      focusHandler,
      pasteHandler,
      inputChangeHanler,
      clickOptionHandler
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