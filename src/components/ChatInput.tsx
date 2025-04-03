
import React, { useContext, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DataContext } from "../context/UserContext.tsx";
import { Send, Mic, MicOff, ArrowUp } from "lucide-react";

const ChatInput = () => {
  const context = useContext(DataContext);
  
  // Add a check for undefined context
  if (!context) {
    return <div className="flex items-center justify-center h-16">
      <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
      <p className="ml-3 text-sm">Loading chat input...</p>
    </div>;
  }
  
  const { 
    inputText, 
    setInputText, 
    handleSubmitText, 
    toggleRecognition, 
    isListening, 
    speaking,
    recognizedSpeech
  } = context;
  
  // Reflect recognized speech in input
  useEffect(() => {
    if (recognizedSpeech && !inputText) {
      setInputText(recognizedSpeech);
    }
  }, [recognizedSpeech]);
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background to-transparent py-4 pointer-events-none"
    >
      <div className="container px-4 mx-auto">
        <form 
          onSubmit={handleSubmitText}
          className="max-w-3xl mx-auto relative pointer-events-auto"
        >
          <div className="glass-card flex items-center gap-2 p-2 rounded-full shadow-lg border border-primary/10">
            <button
              type="button"
              onClick={toggleRecognition}
              className={`p-3 rounded-full transition-colors ${
                isListening ? 'bg-red-500 text-white' : 'bg-primary/10 text-primary hover:bg-primary/20'
              }`}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>
            
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ask me anything about your PDF..."
              className="flex-1 bg-transparent border-none focus:outline-none py-2 px-3"
            />
            
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-3 bg-primary text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90"
            >
              {speaking ? <ArrowUp className="w-5 h-5" /> : <Send className="w-5 h-5" />}
            </button>
          </div>
          
          {isListening && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute -top-10 left-4 bg-red-50 text-red-500 px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1"
            >
              <span className="animate-pulse w-2 h-2 bg-red-500 rounded-full"></span>
              Listening...
            </motion.div>
          )}
        </form>
      </div>
    </motion.div>
  );
};

export default ChatInput;
