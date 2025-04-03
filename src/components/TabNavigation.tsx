
import React from "react";
import { Bot, FileText, BookOpen, Video } from "lucide-react";

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
    { id: "interview", label: "Interview", icon: <Video className="w-4 h-4" />, disabled: !pdfContent }
  ];

  return (
    <div className="flex justify-center mb-8">
      <div className="glass-card flex rounded-full overflow-hidden p-1 shadow-md">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            disabled={tab.disabled}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-full transition-all duration-300 ${
              activeTab === tab.id
                ? "bg-primary text-white shadow-sm" 
                : "text-foreground hover:bg-white/80 hover:text-primary"
            } ${tab.disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default TabNavigation;
