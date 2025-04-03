
import React from "react";
import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";

interface PdfNotificationProps {
  showPdfNotification: boolean;
  setActiveTab: (tab: string) => void;
}

const PdfNotification: React.FC<PdfNotificationProps> = ({ showPdfNotification, setActiveTab }) => {
  if (!showPdfNotification) return null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-lg mx-auto mb-8 p-4 bg-amber-50 text-amber-800 rounded-lg flex items-center gap-3 shadow-sm"
    >
      <AlertCircle className="w-5 h-5 text-amber-600" />
      <p className="text-sm">Please upload a PDF document first to use this feature.</p>
      <button 
        onClick={() => {
          setActiveTab("chat");
          document.getElementById('pdf-upload')?.click();
        }}
        className="ml-auto text-xs bg-amber-100 px-3 py-1 rounded hover:bg-amber-200 transition-colors"
      >
        Upload PDF
      </button>
    </motion.div>
  );
};

export default PdfNotification;
