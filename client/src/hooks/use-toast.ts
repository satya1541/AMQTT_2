import { Toast, ToastActionElement, ToastProps } from "@/components/ui/toast"

import {
  useToast as useToastOriginal,
  type ToastOptions as ToastOptionsOriginal,
} from "@/components/ui/use-toast"

export interface ToastOptions extends ToastOptionsOriginal {
  title?: string
  description?: React.ReactNode
  action?: ToastActionElement
  variant?: "default" | "destructive" | "success" | "warning" | "info" | "connecting"
}

export const useToast = () => {
  const { toast: originalToast, ...rest } = useToastOriginal()

  const toast = ({ title, description, action, variant, ...props }: ToastOptions) => {
    originalToast({
      ...props,
      className: variant && (
        variant === "success" ? "bg-green-800 border-green-500 text-green-100" : 
        variant === "warning" ? "bg-yellow-800 border-yellow-500 text-yellow-100" : 
        variant === "info" ? "bg-blue-800 border-blue-500 text-blue-100" : 
        variant === "connecting" ? "bg-purple-800 border-purple-500 text-purple-100" :
        variant === "destructive" ? "bg-red-800 border-red-500 text-red-100" : ""
      ),
      title: title,
      description: description,
      action: action
    })
  }

  return { toast, ...rest }
}
