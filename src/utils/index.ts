/**
 * 创建高亮模块
 */
export function createHighLightNode (content: string, symbolWord: string = '@', needPreSymbol: boolean = true): HTMLSpanElement {
  const node = document.createElement('span');
  node.className = 'dynamic-wrapper';
  // contenteditable属性默认会继承父级，而我们为了保证可以一次性删除掉@模块，
  // 故手动设置为不可编辑是有必要的
  node.setAttribute('contenteditable', 'false');
  node.innerText = `${needPreSymbol ? symbolWord : ''}${content}`;
  return node;
}

/**
 * 创建文本节点
 */
export function createTextNode (content: string): Text {
  return document.createTextNode(content);
}

/**
 * 平台判断
 */
export function isMacLike(): boolean {
  return /(Mac|iPhone|iPad)/i.test(navigator.userAgent);
}