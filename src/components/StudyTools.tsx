
import React, { useState, useContext } from "react";
import { motion } from "framer-motion";
import { DataContext } from "../context/UserContext";
import { Book, Clock, Lightbulb, Calendar, Brain, ListChecks } from "lucide-react";
import { useToast } from "../hooks/use-toast";

const StudyTools: React.FC = () => {
  const context = useContext(DataContext);
  const { toast } = useToast();
  const [activeStudyTool, setActiveStudyTool] = useState<string | null>(null);
  
  if (!context) {
    return <div>Loading context...</div>;
  }
  
  const { pdfContent, speak } = context;
  
  const studyTools = [
    {
      id: "flashcards",
      name: "Flashcard Generator",
      icon: <Book className="w-6 h-6" />,
      description: "Create flashcards from your PDF or any topic to help with memorization",
      comingSoon: false
    },
    {
      id: "pomodoro",
      name: "Pomodoro Timer",
      icon: <Clock className="w-6 h-6" />,
      description: "Use the Pomodoro technique to manage study sessions and breaks",
      comingSoon: false
    },
    {
      id: "mindmap",
      name: "Mind Mapping",
      icon: <Brain className="w-6 h-6" />,
      description: "Visualize concepts and their relationships to better understand complex topics",
      comingSoon: true
    },
    {
      id: "scheduler",
      name: "Study Scheduler",
      icon: <Calendar className="w-6 h-6" />,
      description: "Create a personalized study schedule based on your learning goals",
      comingSoon: true
    },
    {
      id: "tips",
      name: "Study Tips",
      icon: <Lightbulb className="w-6 h-6" />,
      description: "Get customized study strategies based on your learning style",
      comingSoon: false
    },
    {
      id: "checklist",
      name: "Study Checklist",
      icon: <ListChecks className="w-6 h-6" />,
      description: "Create and track study goals and tasks to stay organized",
      comingSoon: true
    }
  ];
  
  const handleToolClick = (toolId: string) => {
    const tool = studyTools.find(t => t.id === toolId);
    
    if (tool?.comingSoon) {
      toast({
        title: "Coming Soon",
        description: `The ${tool.name} feature will be available soon!`,
      });
      return;
    }
    
    setActiveStudyTool(toolId);
    
    // Demo speech for study tips
    if (toolId === "tips") {
      speak("Here are some effective study tips: First, use active recall by testing yourself rather than just rereading notes. Second, try spaced repetition to review information at increasing intervals. Third, teach concepts to someone else to solidify your understanding.");
    }
  };
  
  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-primary mb-2">Study Tools</h2>
        <p className="text-muted-foreground max-w-md mx-auto">
          Enhance your learning experience with these AI-powered study tools
        </p>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {studyTools.map((tool) => (
          <motion.div
            key={tool.id}
            whileHover={{ scale: 1.02 }}
            className={`glass-card p-6 rounded-lg cursor-pointer transition-all duration-300 ${
              tool.comingSoon ? "opacity-70" : ""
            }`}
            onClick={() => handleToolClick(tool.id)}
          >
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4 text-primary">
              {tool.icon}
            </div>
            <h3 className="font-medium text-lg mb-2">
              {tool.name}
              {tool.comingSoon && (
                <span className="ml-2 text-xs bg-secondary/20 text-secondary px-2 py-0.5 rounded-full">
                  Coming Soon
                </span>
              )}
            </h3>
            <p className="text-sm text-muted-foreground">{tool.description}</p>
          </motion.div>
        ))}
      </div>
      
      {activeStudyTool === "flashcards" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 glass-card p-6 rounded-lg"
        >
          <h3 className="text-xl font-medium mb-4">Flashcard Generator</h3>
          <p className="mb-4">
            {pdfContent 
              ? "Generate flashcards based on your uploaded PDF or any topic you're studying."
              : "Upload a PDF first or specify a topic to generate flashcards for your study sessions."}
          </p>
          
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Topic or Concept</label>
              <input 
                type="text" 
                placeholder="E.g., Photosynthesis, World War II, Machine Learning..."
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Number of Cards</label>
              <select className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/50">
                <option value="5">5 cards</option>
                <option value="10" selected>10 cards</option>
                <option value="15">15 cards</option>
                <option value="20">20 cards</option>
              </select>
            </div>
            
            <button className="mt-2 bg-primary text-white py-2 px-4 rounded-md hover:bg-primary/90 transition-colors">
              Generate Flashcards
            </button>
          </div>
        </motion.div>
      )}
      
      {activeStudyTool === "pomodoro" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 glass-card p-6 rounded-lg"
        >
          <h3 className="text-xl font-medium mb-4">Pomodoro Timer</h3>
          <p className="mb-4">
            The Pomodoro Technique uses timed intervals (typically 25 minutes) of focused work followed by short breaks to improve productivity.
          </p>
          
          <div className="text-center py-8">
            <div className="text-5xl font-bold mb-6">25:00</div>
            
            <div className="flex justify-center gap-4">
              <button className="bg-primary text-white py-2 px-6 rounded-full hover:bg-primary/90 transition-colors">
                Start
              </button>
              <button className="bg-gray-200 text-gray-800 py-2 px-6 rounded-full hover:bg-gray-300 transition-colors">
                Reset
              </button>
            </div>
            
            <div className="mt-8 flex justify-center gap-4">
              <button className="bg-primary/10 text-primary py-1 px-4 rounded-full hover:bg-primary/20 transition-colors text-sm">
                Work (25m)
              </button>
              <button className="bg-gray-100 text-gray-700 py-1 px-4 rounded-full hover:bg-gray-200 transition-colors text-sm">
                Short Break (5m)
              </button>
              <button className="bg-gray-100 text-gray-700 py-1 px-4 rounded-full hover:bg-gray-200 transition-colors text-sm">
                Long Break (15m)
              </button>
            </div>
          </div>
        </motion.div>
      )}
      
      {activeStudyTool === "tips" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 glass-card p-6 rounded-lg"
        >
          <h3 className="text-xl font-medium mb-4">Study Tips</h3>
          <p className="mb-4">
            Here are some evidence-based study techniques to help you learn more effectively:
          </p>
          
          <ul className="space-y-4">
            <li className="p-3 bg-primary/5 rounded-lg flex items-start gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary flex-shrink-0">1</div>
              <div>
                <h4 className="font-medium">Active Recall</h4>
                <p className="text-sm text-muted-foreground">Test yourself by trying to recall information from memory rather than simply rereading your notes.</p>
              </div>
            </li>
            
            <li className="p-3 bg-primary/5 rounded-lg flex items-start gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary flex-shrink-0">2</div>
              <div>
                <h4 className="font-medium">Spaced Repetition</h4>
                <p className="text-sm text-muted-foreground">Review information at increasing intervals to enhance long-term retention.</p>
              </div>
            </li>
            
            <li className="p-3 bg-primary/5 rounded-lg flex items-start gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary flex-shrink-0">3</div>
              <div>
                <h4 className="font-medium">Teach Someone Else</h4>
                <p className="text-sm text-muted-foreground">Explaining concepts to others helps solidify your understanding and identify knowledge gaps.</p>
              </div>
            </li>
            
            <li className="p-3 bg-primary/5 rounded-lg flex items-start gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary flex-shrink-0">4</div>
              <div>
                <h4 className="font-medium">Chunking</h4>
                <p className="text-sm text-muted-foreground">Break down complex information into smaller, manageable chunks to make it easier to process and remember.</p>
              </div>
            </li>
            
            <li className="p-3 bg-primary/5 rounded-lg flex items-start gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary flex-shrink-0">5</div>
              <div>
                <h4 className="font-medium">Dual Coding</h4>
                <p className="text-sm text-muted-foreground">Combine verbal and visual learning methods to strengthen memory and understanding.</p>
              </div>
            </li>
          </ul>
        </motion.div>
      )}
    </div>
  );
};

export default StudyTools;
