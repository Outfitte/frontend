import { toast as sonnerToast, type ExternalToast } from 'sonner'

export const toast = {
  error: (message: string, opts?: ExternalToast) => sonnerToast.error(message, opts),
  success: (message: string, opts?: ExternalToast) => sonnerToast.success(message, opts),
  info: (message: string, opts?: ExternalToast) => sonnerToast.info(message, opts),
}
