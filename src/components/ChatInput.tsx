
import React, { useContext, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DataContext } from "../context/UserContext";
import { Send, Mic, MicOff, ArrowUp, Sparkles } from "lucide-react";

const ChatInput = () => {
  const context = useContext(DataContext);
  
  // Add a check for undefined context
  if (!context) {
    return (
      <div className="fixed bottom-0 left-0 right-0 py-4 bg-gradient-to-t from-background via-background to-transparent">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto bg-white/20 backdrop-blur-md border border-white/10 rounded-full h-14 animate-pulse flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
            <p className="ml-3 text-sm">Loading chat input...</p>
          </div>
        </div>
      </div>
    );
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
  }, [recognizedSpeech, inputText, setInputText]);
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-background via-background to-transparent py-6 pointer-events-none z-10"
    >
      <div className="container px-4 mx-auto">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            if (inputText.trim()) {
              handleSubmitText(e);
            }
          }}
          className="max-w-3xl mx-auto relative pointer-events-auto"
        >
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/50 to-secondary/50 rounded-full opacity-70 blur-sm group-hover:opacity-100 transition-all duration-300"></div>
            
            <div className="relative flex items-center gap-2 p-2 bg-white/90 backdrop-blur-md rounded-full shadow-lg">
              <button
                type="button"
                onClick={toggleRecognition}
                className={`p-3 rounded-full transition-all ${
                  isListening 
                    ? 'bg-red-500 text-white hover:bg-red-600' 
                    : 'bg-primary/10 text-primary hover:bg-primary/20'
                }`}
              >
                {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Ask me anything about your PDF..."
                  className="w-full bg-transparent border-none focus:outline-none py-2 px-3 text-foreground"
                />
                {isListening && (
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1.5">
                    <span className="h-2 w-2 bg-red-500 rounded-full animate-pulse"></span>
                    <span className="text-xs text-red-500 font-medium">Listening...</span>
                  </div>
                )}
              </div>
              
              <button
                type="submit"
                disabled={!inputText.trim()}
                className={`p-3 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  speaking 
                    ? 'bg-secondary text-white hover:bg-secondary/90' 
                    : 'bg-primary text-white hover:bg-primary/90'
                }`}
              >
                {speaking ? <Sparkles className="w-5 h-5" /> : <Send className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </form>
      </div>
    </motion.div>
  );
};

export default ChatInput;
