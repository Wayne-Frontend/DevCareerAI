type NotifyType = 'success' | 'warning' | 'error' | 'info'

export function notify(message: string, type: NotifyType = 'info') {
  window.dispatchEvent(new CustomEvent('app-notify', { detail: { message, type } }))

  if (type === 'error') {
    console.error(message)
    return
  }

  console.log(`[${type}] ${message}`)
}
