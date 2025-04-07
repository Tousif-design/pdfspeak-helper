
import React, { useContext, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { DataContext } from "../context/UserContext";
import Hero from "../components/Hero";
import PDFViewer from "../components/PDFViewer";
import MockTestGenerator from "../components/MockTestGenerator";
import InterviewSimulator from "../components/InterviewSimulator";
import ChatInput from "../components/ChatInput";
import ChatSection from "../components/ChatSection";
import TabNavigation from "../components/TabNavigation";
import PdfNotification from "../components/PdfNotification";
import StudyTools from "../components/StudyTools";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const Index = () => {
  const context = useContext(DataContext);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("chat");
  
  // Always declare this value at the top level, not conditionally
  const showPdfNotification = context && 
    (activeTab === "pdf" || activeTab === "test" || activeTab === "interview") && 
    !context.pdfContent;
  
  useEffect(() => {
    // Simulate loading completion with shorter delay
    const timer = setTimeout(() => {
      setLoading(false);
    }, 800);
    
    return () => clearTimeout(timer);
  }, []);
  
  // Handle mock test generation
  useEffect(() => {
    if (context && context.mockTest && activeTab === "chat") {
      setActiveTab("test");
      toast.success("Mock test generated", {
        description: "Your personalized test is ready to take"
      });
    }
  }, [context?.mockTest, activeTab]);

  // Handle speech recognition with error handling
  useEffect(() => {
    if (context && context.recognizedSpeech) {
      try {
        console.log("Speech recognized:", context.recognizedSpeech);
        const speechEvent = new CustomEvent('speechRecognition', {
          detail: { transcript: context.recognizedSpeech }
        });
        
        window.dispatchEvent(speechEvent);
        
        // Reset the recognized speech after dispatching the event
        setTimeout(() => {
          if (context.setRecognizedSpeech) {
            context.setRecognizedSpeech("");
          }
        }, 100);
      } catch (error) {
        console.error("Error handling speech recognition:", error);
      }
    }
  }, [context?.recognizedSpeech]);
  
  // Add an effect to check if the application is actually rendering
  useEffect(() => {
    console.log("Application rendering status:", {
      contextAvailable: !!context,
      activeTab,
      loading
    });
  }, [context, activeTab, loading]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-background via-background to-secondary/20 flex-col">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <h2 className="mt-4 text-xl font-medium">Loading your assistant...</h2>
        <p className="text-muted-foreground mt-2">Preparing your personalized study environment</p>
      </div>
    );
  }
  
  if (!context) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-background via-background to-secondary/20">
        <div className="text-center p-6 max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold mb-2">Application Error</h2>
          <p className="mb-4">We're having trouble loading your data. Please try refreshing the page.</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }
  
  const { pdfContent, mockTest } = context;

  return (
    <main className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-slate-100 to-blue-50 dark:from-slate-950 dark:via-slate-900 dark:to-blue-950">
      <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-5 z-0 pointer-events-none"></div>
      
      <Hero />
      
      <div className="container px-4 py-8 flex-1 flex flex-col relative z-10">
        <TabNavigation 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          pdfContent={pdfContent} 
        />
        
        {showPdfNotification && (
          <PdfNotification 
            showPdfNotification={showPdfNotification} 
            setActiveTab={setActiveTab}
          />
        )}
        
        <div className="flex-1 flex flex-col">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="mb-20 flex-1"
          >
            {activeTab === "chat" && <ChatSection setActiveTab={setActiveTab} />}
            {activeTab === "pdf" && <PDFViewer />}
            {activeTab === "test" && <MockTestGenerator />}
            {activeTab === "interview" && <InterviewSimulator />}
            {activeTab === "study" && <StudyTools />}
          </motion.div>
        </div>
        
        {activeTab === "chat" && <ChatInput />}
      </div>
    </main>
  );
};

export default Index;
