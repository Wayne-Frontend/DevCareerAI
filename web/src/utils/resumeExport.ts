import type { ResumeRecord } from '@/types/resume'
import { notify } from './notify'

const EXPERIENCE_LABELS: Record<string, string> = {
  junior: '应届 / 1 年以内',
  '1-3': '1-3 年',
  '3-5': '3-5 年',
  '5+': '5 年以上',
}

function experienceLabel(value?: string) {
  if (!value) return ''
  return EXPERIENCE_LABELS[value] ?? value
}

/**
 * 生成用于下载的安全文件名（不含扩展名）。去掉 Windows / *nix 下的非法字符和首尾空白点，
 * 空标题回退为“简历”，避免生成 `.md` 这类无名文件。
 */
export function sanitizeFileName(title: string): string {
  const cleaned = title
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[.\s]+|[.\s]+$/g, '')
    .trim()
  return cleaned || '简历'
}

/**
 * 把简历组装成 Markdown 文本：标题 + 元信息行 + 分隔线 + 正文原文。
 * 纯函数，不做任何副作用，便于单测。
 */
export function buildResumeMarkdown(resume: ResumeRecord): string {
  const meta = [
    resume.targetRole?.trim() && `目标岗位：${resume.targetRole.trim()}`,
    experienceLabel(resume.experienceLevel) &&
      `经验年限：${experienceLabel(resume.experienceLevel)}`,
  ].filter(Boolean)

  return [
    `# ${resume.title || '未命名简历'}`,
    meta.length ? `\n${meta.join(' ｜ ')}` : '',
    '\n---\n',
    resume.content?.trimEnd() ?? '',
    '',
  ].join('\n')
}

/** 触发浏览器下载一份 Markdown 文件。 */
export function downloadResumeMarkdown(resume: ResumeRecord): void {
  const markdown = buildResumeMarkdown(resume)
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${sanitizeFileName(resume.title)}.md`
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/**
 * 打开一个自包含的打印窗口并触发浏览器打印。用户在打印对话框里选“另存为 PDF”即可得到
 * 文字可选、中文原生的 PDF——零依赖，避免 jsPDF 截图式的字体与分页坑。
 * 正文经过 HTML 转义后以 pre-wrap 原样呈现，保真换行与空格。
 */
export function printResume(resume: ResumeRecord): void {
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    notify('浏览器拦截了打印窗口，请允许弹窗后重试', 'warning')
    return
  }

  const meta = [resume.targetRole?.trim(), experienceLabel(resume.experienceLevel)].filter(Boolean)

  const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(sanitizeFileName(resume.title))}</title>
<style>
  @page { margin: 18mm 16mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 24px;
    font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", "Segoe UI", sans-serif;
    color: #1f2937;
    line-height: 1.7;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .resume-title { margin: 0 0 6px; font-size: 24px; font-weight: 800; color: #0f172a; }
  .resume-meta { margin: 0 0 14px; font-size: 13px; color: #64748b; }
  .resume-divider { border: none; border-top: 1px solid #e2e8f0; margin: 0 0 18px; }
  .resume-body { white-space: pre-wrap; word-break: break-word; font-size: 14px; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <h1 class="resume-title">${escapeHtml(resume.title || '未命名简历')}</h1>
  ${meta.length ? `<p class="resume-meta">${escapeHtml(meta.join(' ｜ '))}</p>` : ''}
  <hr class="resume-divider" />
  <div class="resume-body">${escapeHtml(resume.content ?? '')}</div>
  <script>
    window.onload = function () {
      window.focus()
      window.print()
    }
  </script>
</body>
</html>`

  printWindow.document.open()
  printWindow.document.write(html)
  printWindow.document.close()
}
