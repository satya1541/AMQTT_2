import { Toast, ToastActionElement, ToastProps } from "@/components/ui/toast"
import { useToast as useToastOriginal } from "@/components/ui/use-toast"

// Define our custom toast options
export interface ToastOptions {
  title?: string
  description?: React.ReactNode
  action?: ToastActionElement
  variant?: "default" | "destructive" | "success" | "warning" | "info" | "connecting"
  duration?: number
  // Allow any other properties
  [key: string]: any
}

export const useToast = () => {
  const { toast: originalToast, ...rest } = useToastOriginal()

  const toast = (options: ToastOptions) => {
    const { title, description, action, variant, duration, ...otherProps } = options
    
    // Apply custom styling based on our variant
    const customClass = variant && (
      variant === "success" ? "bg-green-800 border-green-500 text-green-100" : 
      variant === "warning" ? "bg-yellow-800 border-yellow-500 text-yellow-100" : 
      variant === "info" ? "bg-blue-800 border-blue-500 text-blue-100" : 
      variant === "connecting" ? "bg-purple-800 border-purple-500 text-purple-100" :
      variant === "destructive" ? "bg-red-800 border-red-500 text-red-100" : ""
    );
    
    // Map our custom variants to the original component's variants
    const mappedVariant = variant === "destructive" ? "destructive" : "default";
    
    // Use the original toast with compatible props
    originalToast({
      duration: duration || 3000,
      className: customClass,
      title,
      description,
      action,
      variant: mappedVariant
    })
  }

  return { toast, ...rest }
}
