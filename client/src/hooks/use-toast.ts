import { ToastActionElement } from "@/components/ui/toast";
import {
  useToast as useToastOriginal,
} from "@/components/ui/use-toast";

// Custom toast options interface
export interface CustomToastOptions {
  id?: string;
  title?: string;
  description?: React.ReactNode;
  action?: ToastActionElement;
  variant?: "default" | "destructive" | "success" | "warning" | "info" | "connecting";
  duration?: number;
  className?: string;
}

export const useToast = () => {
  const { toast: originalToast, ...rest } = useToastOriginal();

  const toast = ({ title, description, action, variant, id, ...props }: CustomToastOptions) => {
    // Generate appropriate class based on variant
    const variantClass = variant && (
      variant === "success" ? "bg-green-800 border-green-500 text-green-100" : 
      variant === "warning" ? "bg-yellow-800 border-yellow-500 text-yellow-100" : 
      variant === "info" ? "bg-blue-800 border-blue-500 text-blue-100" : 
      variant === "connecting" ? "bg-purple-800 border-purple-500 text-purple-100" :
      variant === "destructive" ? "bg-red-800 border-red-500 text-red-100" : ""
    );

    // Create the toast options without custom properties
    const toastOptions = {
      title,
      description,
      action,
      ...props,
      // Only include custom class if we have a variant
      className: variantClass ? variantClass : props.className,
    };

    // Call the original toast function
    originalToast(toastOptions);
  };

  return { toast, ...rest };
};
