export type MessageBoxType = 'success' | 'warning' | 'danger' | 'info'

export interface MessageBoxOptions {
  type?: MessageBoxType
  title: string
  message?: string
  confirmText?: string
  cancelText?: string
  showCancel?: boolean
  closeOnOverlay?: boolean
  closeOnEsc?: boolean
  beforeConfirm?: () => void | Promise<void>
}

export interface MessageBoxRequest {
  id: number
  options: MessageBoxOptions
  resolve: (confirmed: boolean) => void
}

let nextMessageBoxId = 1

function openMessageBox(options: MessageBoxOptions) {
  return new Promise<boolean>((resolve) => {
    const request: MessageBoxRequest = {
      id: nextMessageBoxId++,
      options,
      resolve,
    }

    window.dispatchEvent(new CustomEvent<MessageBoxRequest>('app-message-box', { detail: request }))
  })
}

export const messageBox = {
  alert(options: MessageBoxOptions) {
    return openMessageBox({
      type: 'info',
      confirmText: '知道了',
      closeOnEsc: true,
      closeOnOverlay: true,
      ...options,
      showCancel: false,
    })
  },

  confirm(options: MessageBoxOptions) {
    return openMessageBox({
      type: 'warning',
      confirmText: '确认',
      cancelText: '取消',
      closeOnEsc: true,
      closeOnOverlay: true,
      ...options,
      showCancel: options.showCancel ?? true,
    })
  },
}
