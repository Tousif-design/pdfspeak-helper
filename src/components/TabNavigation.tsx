
import React from "react";
import { Bot, FileText, BookOpen, Video, Brain } from "lucide-react";
import { motion } from "framer-motion";

interface TabNavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  pdfContent: string | null;
}

const TabNavigation: React.FC<TabNavigationProps> = ({ activeTab, setActiveTab, pdfContent }) => {
  const tabs = [
    { id: "chat", label: "AI Assistant", icon: <Bot className="w-4 h-4" /> },
    { id: "pdf", label: "PDF Analysis", icon: <FileText className="w-4 h-4" />, disabled: !pdfContent },
    { id: "test", label: "Mock Tests", icon: <BookOpen className="w-4 h-4" />, disabled: !pdfContent },
    { id: "interview", label: "Interview Prep", icon: <Video className="w-4 h-4" />, disabled: !pdfContent },
    { id: "study", label: "Study Tools", icon: <Brain className="w-4 h-4" /> }
  ];

  const handleTabClick = (tabId: string, isDisabled: boolean | undefined) => {
    if (isDisabled) {
      // If tab requires PDF but none is uploaded, show upload dialog
      document.getElementById('pdf-upload')?.click();
    } else {
      setActiveTab(tabId);
    }
  };

  return (
    <div className="flex justify-center mb-8 relative">
      <div className="bg-white/80 backdrop-blur-xl border border-slate-200/50 dark:bg-slate-900/80 dark:border-slate-700/50 shadow-xl rounded-2xl p-1.5 relative z-10">
        <div className="flex flex-wrap justify-center">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabClick(tab.id, tab.disabled)}
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
      
      {/* Decorative elements */}
      <div className="absolute top-1/2 w-full h-px bg-gradient-to-r from-transparent via-blue-200/30 dark:via-blue-700/20 to-transparent -z-10 transform -translate-y-1/2"></div>
    </div>
  );
};

export default TabNavigation;
