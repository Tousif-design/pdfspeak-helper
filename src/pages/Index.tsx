
import React, { useContext, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { DataContext } from "../context/UserContext";
import Hero from "../components/Hero";
import PDFViewer from "../components/PDFViewer";
import MockTestGenerator from "../components/MockTestGenerator";
import InterviewSimulator from "../components/InterviewSimulator";
import ChatInput from "../components/ChatInput";
import ChatSection from "../components/ChatSection";
import TabNavigation from "../components/TabNavigation";
import PdfNotification from "../components/PdfNotification";

const Index = () => {
  const context = useContext(DataContext);
  
  if (!context) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }
  
  const { 
    pdfContent, 
    mockTest,
    recognizedSpeech
  } = context;
  
  const [activeTab, setActiveTab] = React.useState("chat");
  
  const showPdfNotification = activeTab !== "chat" && !pdfContent;

  // Switch to test tab when a mock test is generated
  useEffect(() => {
    if (mockTest && activeTab === "chat") {
      setActiveTab("test");
    }
  }, [mockTest, activeTab]);

  // Handle speech recognition events
  useEffect(() => {
    if (recognizedSpeech) {
      const speechEvent = new CustomEvent('speechRecognition', {
        detail: { transcript: recognizedSpeech }
      });
      
      window.dispatchEvent(speechEvent);
    }
  }, [recognizedSpeech]);

  return (
    <main className="min-h-screen flex flex-col bg-gradient-to-b from-background via-background to-secondary/20">
      <Hero />
      
      <div className="container px-4 py-8">
        <TabNavigation 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          pdfContent={pdfContent} 
        />
        
        <PdfNotification 
          showPdfNotification={showPdfNotification} 
          setActiveTab={setActiveTab}
        />
        
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="mb-20"
          >
            {activeTab === "chat" && <ChatSection setActiveTab={setActiveTab} />}
            {activeTab === "pdf" && <PDFViewer />}
            {activeTab === "test" && <MockTestGenerator />}
            {activeTab === "interview" && <InterviewSimulator />}
          </motion.div>
        </AnimatePresence>
        
        {activeTab === "chat" && <ChatInput />}
      </div>
    </main>
  );
};

export default Index;
