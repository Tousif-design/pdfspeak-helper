
import React from "react";
import { motion } from "framer-motion";
import { AlertCircle, InfoIcon } from "lucide-react";

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
      className="max-w-lg mx-auto mb-8 p-4 bg-amber-50 text-amber-800 rounded-lg flex items-center gap-3 shadow-sm border border-amber-200"
    >
      <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
      <div className="text-sm">
        <p className="font-medium">PDF Required</p>
        <p>Please upload a PDF document first to use this feature. PDFs allow for better analysis and personalized study materials.</p>
      </div>
      <button 
        onClick={() => {
          setActiveTab("chat");
          document.getElementById('pdf-upload')?.click();
        }}
        className="ml-auto text-xs bg-amber-100 px-3 py-1.5 rounded-md hover:bg-amber-200 transition-colors border border-amber-300 font-medium flex items-center gap-1.5 whitespace-nowrap"
      >
        <InfoIcon className="w-3.5 h-3.5" />
        Upload PDF
      </button>
    </motion.div>
  );
};

export default PdfNotification;
