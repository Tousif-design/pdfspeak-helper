
import React from "react";
import { motion } from "framer-motion";
import { FileUp, Info } from "lucide-react";

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
      className="max-w-lg mx-auto mb-8 overflow-hidden shadow-lg"
    >
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/30 dark:to-blue-950/30 p-1 rounded-xl">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-lg flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0">
            <Info className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          
          <div className="flex-1">
            <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-1">PDF Required</h4>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Please upload a PDF document first to use this feature. PDFs allow for better analysis and personalized study materials.
            </p>
          </div>
          
          <button 
            onClick={() => {
              setActiveTab("chat");
              setTimeout(() => {
                document.getElementById('pdf-upload')?.click();
              }, 100);
            }}
            className="flex-shrink-0 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-4 py-2 rounded-lg text-white font-medium flex items-center gap-2 transition-all shadow-md shadow-blue-500/10"
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
