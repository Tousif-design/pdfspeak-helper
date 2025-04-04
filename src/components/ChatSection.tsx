
import React, { useContext } from "react";
import { motion } from "framer-motion";
import { DataContext } from "../context/UserContext";
import { FileText, BookOpen, Bot, Upload, PauseCircle, PlayCircle } from "lucide-react";
import ExampleQueries from './ExampleQueries';
import { toast } from "sonner";

interface ChatSectionProps {
  setActiveTab: (tab: string) => void;
}

const ChatSection: React.FC<ChatSectionProps> = ({ setActiveTab }) => {
  const context = useContext(DataContext);
  
  if (!context) {
    return <div>Loading context...</div>;
  }
  
  const { 
    userQuery, 
    aiResponse, 
    pdfContent, 
    pdfName, 
    isPdfAnalyzed, 
    handleFileUpload, 
    isProcessingPdf,
    speaking,
    stopSpeaking,
    speak,
    toggleRecognition,
    isListening
  } = context;

  const handleStopConversation = () => {
    stopSpeaking();
    toast("Conversation paused", {
      description: "Voice output has been stopped",
    });
  };

  const handleResumeConversation = () => {
    if (aiResponse) {
      speak(aiResponse);
      toast("Conversation resumed", {
        description: "Voice output has been resumed",
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {(userQuery || aiResponse) && (
        <div className="mb-8 space-y-4">
          <div className="flex justify-center gap-2 mb-4">
            <button
              onClick={handleStopConversation}
              className="flex items-center gap-2 bg-red-500 text-white py-2 px-4 rounded-full hover:bg-red-600 transition-colors"
            >
              <PauseCircle className="w-4 h-4" />
              <span>Stop Voice</span>
            </button>
            
            <button
              onClick={handleResumeConversation}
              className="flex items-center gap-2 bg-green-500 text-white py-2 px-4 rounded-full hover:bg-green-600 transition-colors"
            >
              <PlayCircle className="w-4 h-4" />
              <span>Resume Voice</span>
            </button>
          </div>
          
          {userQuery && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card rounded-lg rounded-tr-sm p-4 ml-auto max-w-[85%] sm:max-w-[75%] bg-white/70"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="w-6 h-6 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-medium">
                  You
                </span>
                <span className="text-xs text-muted-foreground">Just now</span>
              </div>
              <p>{userQuery}</p>
            </motion.div>
          )}

          {aiResponse && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass-card rounded-lg rounded-tl-sm p-4 mr-auto max-w-[85%] sm:max-w-[75%] bg-primary/5"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-xs font-medium">
                  AI
                </span>
                <span className="text-xs text-muted-foreground">Just now</span>
              </div>
              <div className="prose prose-sm max-w-none">
                {aiResponse === "Thinking... 🤔" || aiResponse === "Analyzing your PDF..." ? (
                  <div className="flex items-center gap-2">
                    <span>{aiResponse}</span>
                    <span className="inline-block w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></span>
                    <span className="inline-block w-1.5 h-1.5 bg-primary rounded-full animate-pulse delay-150"></span>
                    <span className="inline-block w-1.5 h-1.5 bg-primary rounded-full animate-pulse delay-300"></span>
                  </div>
                ) : (
                  <p className="whitespace-pre-line">{aiResponse}</p>
                )}
              </div>
            </motion.div>
          )}
        </div>
      )}

      {!userQuery && !aiResponse && (
        <WelcomeSection 
          pdfContent={pdfContent} 
          pdfName={pdfName} 
          isPdfAnalyzed={isPdfAnalyzed} 
          handleFileUpload={handleFileUpload} 
          isProcessingPdf={isProcessingPdf}
          setActiveTab={setActiveTab}
        />
      )}
    </div>
  );
};

interface WelcomeSectionProps {
  pdfContent: string;
  pdfName: string;
  isPdfAnalyzed: boolean;
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  isProcessingPdf: boolean;
  setActiveTab: (tab: string) => void;
}

const WelcomeSection: React.FC<WelcomeSectionProps> = ({ pdfContent, pdfName, isPdfAnalyzed, handleFileUpload, isProcessingPdf, setActiveTab }) => {
  return (
    <div className="text-center py-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-20 h-20 mx-auto bg-primary/5 rounded-full flex items-center justify-center mb-4"
      >
        {pdfContent ? <FileText className="w-10 h-10 text-primary" /> : <Bot className="w-10 h-10 text-primary" />}
      </motion.div>

      {pdfContent ? (
        <>
          <h3 className="text-xl font-medium mb-2">PDF Uploaded: {pdfName}</h3>
          <p className="text-muted-foreground max-w-md mx-auto mb-4">
            {isPdfAnalyzed
              ? "Your PDF has been analyzed and is ready for questions. Try asking something specific about the content."
              : "Your PDF is being analyzed. Please wait a moment before asking questions."}
          </p>

          <div className="flex justify-center gap-3 mt-4">
            <button
              onClick={() => setActiveTab("pdf")}
              className="flex items-center gap-2 bg-primary/10 text-primary py-2 px-4 rounded-full hover:bg-primary/20 transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span>View PDF Analysis</span>
            </button>

            <button
              onClick={() => setActiveTab("test")}
              className="flex items-center gap-2 bg-primary/10 text-primary py-2 px-4 rounded-full hover:bg-primary/20 transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              <span>Generate Mock Test</span>
            </button>
          </div>
        </>
      ) : (
        <>
          <h3 className="text-xl font-medium mb-2">How can I help you today?</h3>
          <p className="text-muted-foreground max-w-md mx-auto mb-4">
            Ask questions, upload a PDF for analysis, or try voice commands by clicking the microphone button.
          </p>

          <div className="mt-6 mb-6">
            <button
              onClick={() => document.getElementById('pdf-upload')?.click()}
              disabled={isProcessingPdf}
              className="flex items-center gap-2 bg-primary text-white py-2 px-4 rounded-full mx-auto hover:bg-primary/90 transition-colors"
            >
              <Upload className="w-4 h-4" />
              <span>Upload PDF</span>
              <input
                type="file"
                id="pdf-upload"
                accept="application/pdf"
                onChange={handleFileUpload}
                disabled={isProcessingPdf}
                className="sr-only"
              />
            </button>
          </div>
        </>
      )}
      
      <ExampleQueries />
    </div>
  );
};

export default ChatSection;
