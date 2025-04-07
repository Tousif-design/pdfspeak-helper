import React, { useState, useEffect } from "react";
import { Bot, FileText, BookOpen, Video, Brain, Menu } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface TabNavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pdfContent: string | null;
}

const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, setActiveTab, pdfContent }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [hasPdfBeenUploaded, setHasPdfBeenUploaded] = useState(false);
  
  useEffect(() => {
    if (pdfContent) {
      setHasPdfBeenUploaded(true);
    }
  }, [pdfContent]);
  
  const tabs = [
    { 
      id: "chat", 
      label: "AI Assistant", 
      icon: <Bot className="w-4 h-4" />,
      disabled: false 
    },
    { 
      id: "pdf", 
      label: "PDF Analysis", 
      icon: <FileText className="w-4 h-4" />, 
      disabled: !pdfContent,
      requiresPdf: true
    },
    { 
      id: "test", 
      label: "Mock Tests", 
      icon: <BookOpen className="w-4 h-4" />, 
      disabled: !pdfContent,
      requiresPdf: true
    },
    { 
      id: "interview", 
      label: "Interview Prep", 
      icon: <Video className="w-4 h-4" />, 
      disabled: !pdfContent,
      requiresPdf: true
    },
    { 
      id: "study", 
      label: "Study Tools", 
      icon: <Brain className="w-4 h-4" />,
      disabled: false
    }
  ];

  const handleTabClick = (tabId: string, isDisabled: boolean | undefined, requiresPdf: boolean | undefined) => {
    if (isDisabled) {
      if (requiresPdf) {
        if (hasPdfBeenUploaded && !pdfContent) {
          toast.error("PDF content unavailable", {
            description: "Please upload a PDF file again to use this feature"
          });
        } else {
          toast.info("PDF required", {
            description: "Please upload a PDF file to use this feature"
          });
          document.getElementById('pdf-upload')?.click();
        }
      }
    } else {
      setActiveTab(tabId);
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <div className="flex justify-center mb-8 relative">
      <div className="md:hidden absolute left-0 top-1/2 transform -translate-y-1/2 z-20">
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 bg-white/80 backdrop-blur-xl border border-slate-200/50 dark:bg-slate-900/80 dark:border-slate-700/50 rounded-lg shadow-lg"
        >
          <Menu className="w-5 h-5 text-primary" />
        </button>
      </div>
      
      {isMobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="absolute top-full left-0 right-0 z-50 bg-white/95 backdrop-blur-xl border border-slate-200/50 dark:bg-slate-900/95 dark:border-slate-700/50 shadow-xl rounded-lg p-2 mt-2 md:hidden"
        >
          <div className="flex flex-col space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id, tab.disabled, tab.requiresPdf)}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-300 ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white" 
                    : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                } ${tab.disabled ? "opacity-50" : ""}`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>
        </motion.div>
      )}
      
      <div className="bg-white/80 backdrop-blur-xl border border-slate-200/50 dark:bg-slate-900/80 dark:border-slate-700/50 shadow-xl rounded-2xl p-1.5 relative z-10 hidden md:block">
        <div className="flex flex-wrap justify-center">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id, tab.disabled, tab.requiresPdf)}
              className={`relative z-10 flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl transition-all duration-300 ${
                activeTab === tab.id
                  ? "text-white" 
                  : "text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60"
              } ${tab.disabled ? "opacity-50" : ""}`}
            >
              {activeTab === tab.id && (
                <motion.span 
                  layoutId="tab-highlight"
                  className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 -z-10"
                  transition={{ type: "spring", duration: 0.6 }}
                />
              )}
              
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>
      
      <div className="md:hidden flex justify-center px-8">
        <div className="bg-white/80 backdrop-blur-xl border border-slate-200/50 dark:bg-slate-900/80 dark:border-slate-700/50 shadow-xl rounded-2xl p-1.5 relative z-10">
          <div className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabClick(tab.id, tab.disabled, tab.requiresPdf)}
                className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-xl transition-all duration-300 ${
                  activeTab === tab.id
                    ? "text-white" 
                    : "text-slate-700 dark:text-slate-200"
                } ${tab.disabled ? "opacity-50" : ""}`}
                aria-label={tab.label}
              >
                {activeTab === tab.id && (
                  <motion.span 
                    layoutId="tab-highlight-mobile"
                    className="absolute inset-0 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 -z-10"
                    transition={{ type: "spring", duration: 0.6 }}
                  />
                )}
                {tab.icon}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <div className="absolute top-1/2 w-full h-px bg-gradient-to-r from-transparent via-blue-200/30 dark:via-blue-700/20 to-transparent -z-10 transform -translate-y-1/2"></div>
    </div>
  );
};

export default TabNavigation;
