### dynamic-input
- 支持通过特殊符号唤起选择框来选择目标数据并键入到当前光标位置的组件
---

###### 支持字段

|  字段   | 类型  |  default | 说明 | 必需 |
|  ----  | ---- | ---- |---- | ---- |
| options  | array | -- | 下拉列表数据 | Y |
| optLabelName  | string | label | 下拉列表对应展示名 | N |
| optValName  | string | value | 下拉列表数据对应数据名 | N |
|  symbolWord  | string | @ | 触发选择列表展示的符号 | N |
|  disabled  | boolean | false | 是否禁用 | N |


###### TODO
[ ] 支持远程搜索，分页