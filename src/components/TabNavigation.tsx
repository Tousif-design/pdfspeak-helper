
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

  return (
    <div className="flex justify-center mb-8 relative">
      <div className="glass-card flex rounded-full overflow-hidden p-1.5 shadow-xl relative z-10 bg-white/70 backdrop-blur-md border border-white/20">
        <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-primary/5 to-secondary/5 z-0"></div>
        
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => !tab.disabled && setActiveTab(tab.id)}
            disabled={tab.disabled}
            className={`relative z-10 flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium rounded-full transition-all duration-300 ${
              activeTab === tab.id
                ? "bg-gradient-to-r from-primary to-primary/90 text-white shadow-md" 
                : "text-foreground hover:bg-white/80 hover:text-primary"
            } ${tab.disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {activeTab === tab.id && (
              <motion.span 
                layoutId="tab-highlight"
                className="absolute inset-0 rounded-full bg-gradient-to-r from-primary to-primary/90 -z-10"
                transition={{ type: "spring", duration: 0.6 }}
              />
            )}
            
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>
      
      {/* Decorative elements */}
      <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/10 to-transparent -z-10"></div>
    </div>
  );
};

export default TabNavigation;
