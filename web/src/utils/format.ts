export function formatDateTime(value: string) {
  const date = new Date(value)
  // 非法日期直接格式化会抛 RangeError，一条脏数据会导致整页渲染崩溃，展示层降级为占位符。
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export function toTagList(value: string) {
  return value
    .split(/[,，\n]/)
    .map((item) => item.trim())
    .filter(Boolean)
}
