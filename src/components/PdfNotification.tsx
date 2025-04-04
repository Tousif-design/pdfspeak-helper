
import React from "react";
import { motion } from "framer-motion";
import { AlertCircle, FileUp, Info } from "lucide-react";

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
      className="max-w-lg mx-auto mb-8 rounded-lg border border-amber-200 overflow-hidden shadow-lg"
    >
      <div className="bg-gradient-to-r from-amber-50 to-amber-100 p-1">
        <div className="bg-white p-4 rounded-md flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
            <AlertCircle className="w-6 h-6 text-amber-600" />
          </div>
          
          <div className="flex-1">
            <h4 className="font-semibold text-amber-800 mb-1">PDF Required</h4>
            <p className="text-sm text-amber-700 leading-relaxed">
              Please upload a PDF document first to use this feature. PDFs allow for better analysis and personalized study materials.
            </p>
          </div>
          
          <button 
            onClick={() => {
              setActiveTab("chat");
              document.getElementById('pdf-upload')?.click();
            }}
            className="flex-shrink-0 bg-gradient-to-r from-amber-500 to-amber-600 px-4 py-2 rounded-md text-white font-medium flex items-center gap-2 hover:from-amber-600 hover:to-amber-700 transition-all shadow-sm"
          >
            <FileUp className="w-4 h-4" />
            <span>Upload PDF</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default PdfNotification;
