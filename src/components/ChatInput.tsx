
import React, { useContext, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DataContext } from "../context/UserContext";
import { Send, Mic, MicOff, ArrowUp, Sparkles, File, Loader2 } from "lucide-react";

const ChatInput = () => {
  const context = useContext(DataContext);
  
  // Add a check for undefined context
  if (!context) {
    return (
      <div className="fixed bottom-0 left-0 right-0 py-4 bg-gradient-to-t from-background via-background to-transparent pointer-events-none">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto bg-white/20 backdrop-blur-md border border-white/10 rounded-full h-14 animate-pulse flex items-center justify-center">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
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
    recognizedSpeech,
    handleFileUpload
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
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-secondary/60 rounded-full opacity-70 blur-md group-hover:opacity-100 transition-all duration-300"></div>
            
            <div className="relative flex items-center gap-2 p-2 bg-white/95 backdrop-blur-md rounded-full shadow-lg border border-white/50">
              <button
                type="button"
                onClick={toggleRecognition}
                className={`p-3 rounded-full transition-all ${
                  isListening 
                    ? 'bg-red-500 text-white hover:bg-red-600 animate-pulse' 
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
                  placeholder={isListening ? "Listening... speak your question" : "Ask me anything about your PDF..."}
                  className="w-full bg-transparent border-none focus:outline-none py-2 px-3 text-foreground"
                />
                {isListening && (
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1.5">
                    <span className="h-2 w-2 bg-red-500 rounded-full animate-[pulse_1s_ease-in-out_infinite]"></span>
                    <span className="h-2 w-2 bg-red-500 rounded-full animate-[pulse_1s_ease-in-out_0.2s_infinite]"></span>
                    <span className="h-2 w-2 bg-red-500 rounded-full animate-[pulse_1s_ease-in-out_0.4s_infinite]"></span>
                  </div>
                )}
              </div>
              
              <button
                type="button"
                onClick={() => document.getElementById('pdf-upload')?.click()}
                className="p-3 rounded-full transition-all bg-secondary/10 text-secondary hover:bg-secondary/20"
                title="Upload PDF"
              >
                <File className="w-5 h-5" />
                <input
                  type="file"
                  id="pdf-upload"
                  accept="application/pdf"
                  onChange={handleFileUpload}
                  className="sr-only"
                />
              </button>
              
              <button
                type="submit"
                disabled={!inputText.trim()}
                className={`p-3 rounded-full transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  speaking 
                    ? 'bg-gradient-to-r from-secondary to-secondary/80 text-white hover:opacity-90' 
                    : 'bg-gradient-to-r from-primary to-primary/80 text-white hover:opacity-90'
                }`}
              >
                {speaking ? <Sparkles className="w-5 h-5" /> : <Send className="w-5 h-5" />}
              </button>
            </div>
          </div>
          
          {/* Keyboard shortcuts hint */}
          <div className="text-xs text-center text-muted-foreground mt-2 opacity-70">
            Press <kbd className="px-1.5 py-0.5 bg-background/50 border border-border rounded mx-1 text-xs">Enter</kbd> to send • 
            <kbd className="px-1.5 py-0.5 bg-background/50 border border-border rounded mx-1 text-xs">M</kbd> to toggle mic
          </div>
        </form>
      </div>
    </motion.div>
  );
};

export default ChatInput;
