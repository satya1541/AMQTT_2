import React from 'react';
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";

interface ToastNotificationProps {
  id: string;
  title?: string;
  description?: React.ReactNode;
  variant?: "default" | "destructive" | "success" | "warning" | "info" | "connecting";
  onClose?: () => void;
}

const ToastNotification: React.FC<ToastNotificationProps> = ({ 
  id, 
  title, 
  description, 
  variant = "default",
  onClose 
}) => {
  const getIcon = () => {
    switch (variant) {
      case "success": return <i className="fas fa-check-circle text-green-500 mt-0.5 mr-2"></i>;
      case "warning": return <i className="fas fa-exclamation-triangle text-yellow-500 mt-0.5 mr-2"></i>;
      case "info": return <i className="fas fa-info-circle text-blue-500 mt-0.5 mr-2"></i>;
      case "connecting": return <i className="fas fa-circle-notch fa-spin text-purple-500 mt-0.5 mr-2"></i>;
      case "destructive": return <i className="fas fa-times-circle text-red-500 mt-0.5 mr-2"></i>;
      default: return null;
    }
  };

  const getClass = () => {
    switch (variant) {
      case "success": return "bg-green-800 border-l-4 border-green-500";
      case "warning": return "bg-yellow-800 border-l-4 border-yellow-500";
      case "info": return "bg-blue-800 border-l-4 border-blue-500";
      case "connecting": return "bg-purple-800 border-l-4 border-purple-500";
      case "destructive": return "bg-red-800 border-l-4 border-red-500";
      default: return "";
    }
  };

  return (
    <Toast id={id} className={`flex items-start ${getClass()} animate-bounce-in`}>
      {getIcon()}
      <div>
        {title && <ToastTitle>{title}</ToastTitle>}
        {description && <ToastDescription>{description}</ToastDescription>}
      </div>
      <ToastClose onClick={onClose} className="ml-auto text-gray-400 hover:text-white" />
    </Toast>
  );
};

export default ToastNotification;
