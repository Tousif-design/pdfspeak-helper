
import React, { useContext, useEffect } from "react";
import { motion } from "framer-motion";
import { DataContext } from "../context/UserContext";
import { FileText, BookOpen, Bot, Upload, PauseCircle, PlayCircle, Mic, MicOff } from "lucide-react";
import ExampleQueries from './ExampleQueries';
import { toast } from "sonner";

interface ChatSectionProps {
  setActiveTab: (tab: string) => void;
}

const ChatSection: React.FC<ChatSectionProps> = ({ setActiveTab }) => {
  const context = useContext(DataContext);
  
  // Use effect to update UI when user query changes
  useEffect(() => {
    if (context?.userQuery) {
      console.log("User query updated:", context.userQuery);
    }
  }, [context?.userQuery]);
  
  // Use effect to update UI when AI response changes
  useEffect(() => {
    if (context?.aiResponse) {
      console.log("AI response updated", {
        responseLength: context.aiResponse.length,
        isThinking: context.aiResponse === "Thinking... 🤔" || context.aiResponse === "Analyzing your PDF..."
      });
    }
  }, [context?.aiResponse]);
  
  if (!context) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
        <p className="text-red-600 dark:text-red-400">Context data is unavailable. Please refresh the page to reconnect.</p>
      </div>
    );
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

  const handleToggleMicrophone = () => {
    toggleRecognition();
    if (!isListening) {
      toast("Microphone activated", {
        description: "I'm listening for your question",
      });
    } else {
      toast("Microphone deactivated", {
        description: "Voice input turned off",
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
            
            <button
              onClick={handleToggleMicrophone}
              className={`flex items-center gap-2 ${
                isListening ? 'bg-blue-500 hover:bg-blue-600' : 'bg-gray-500 hover:bg-gray-600'
              } text-white py-2 px-4 rounded-full transition-colors`}
            >
              {isListening ? (
                <>
                  <MicOff className="w-4 h-4" />
                  <span>Stop Listening</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" />
                  <span>Start Listening</span>
                </>
              )}
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
              <p className="whitespace-pre-line break-words">{userQuery}</p>
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
                  <p className="whitespace-pre-line break-words">{aiResponse}</p>
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
          isListening={isListening}
          toggleRecognition={toggleRecognition}
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
  isListening: boolean;
  toggleRecognition: () => void;
}

const WelcomeSection: React.FC<WelcomeSectionProps> = ({ 
  pdfContent, 
  pdfName, 
  isPdfAnalyzed, 
  handleFileUpload, 
  isProcessingPdf, 
  setActiveTab,
  isListening,
  toggleRecognition
}) => {
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

          <div className="flex justify-center gap-3 mt-4 flex-wrap">
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
            
            <button
              onClick={toggleRecognition}
              className={`flex items-center gap-2 ${
                isListening ? 'bg-blue-500 text-white' : 'bg-primary/10 text-primary'
              } py-2 px-4 rounded-full hover:bg-primary/20 transition-colors mt-2 sm:mt-0`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              <span>{isListening ? 'Stop Listening' : 'Ask with Voice'}</span>
            </button>
          </div>
        </>
      ) : (
        <>
          <h3 className="text-xl font-medium mb-2">How can I help you today?</h3>
          <p className="text-muted-foreground max-w-md mx-auto mb-4">
            Ask questions, upload a PDF for analysis, or try voice commands by clicking the microphone button.
          </p>

          <div className="mt-6 mb-6 flex flex-wrap justify-center gap-3">
            <button
              onClick={() => document.getElementById('pdf-upload')?.click()}
              disabled={isProcessingPdf}
              className="flex items-center gap-2 bg-primary text-white py-2 px-4 rounded-full hover:bg-primary/90 transition-colors"
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
            
            <button
              onClick={toggleRecognition}
              className={`flex items-center gap-2 ${
                isListening ? 'bg-blue-500 text-white' : 'bg-gray-600 text-white'
              } py-2 px-4 rounded-full hover:opacity-90 transition-colors`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              <span>{isListening ? 'Stop Listening' : 'Start Listening'}</span>
            </button>
          </div>
        </>
      )}
      
      <ExampleQueries />
    </div>
  );
};

export default ChatSection;
