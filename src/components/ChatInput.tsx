
import React, { useContext, useState } from "react";
import { Send, Mic, StopCircle, File, Volume2, VolumeX } from "lucide-react";
import { DataContext } from "../context/UserContext";
import { motion } from "framer-motion";

const ChatInput = () => {
  const context = useContext(DataContext);
  
  // Add a check for undefined context
  if (!context) {
    return <div className="flex items-center justify-center h-16">Loading...</div>;
  }

  const { 
    toggleRecognition, 
    isListening, 
    speaking,
    stopSpeaking,
    inputText,
    setInputText,
    handleSubmitText,
    handleFileUpload,
    isProcessingPdf
  } = context;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="max-w-4xl w-full mx-auto sticky bottom-4 mt-4"
    >
      <form 
        onSubmit={handleSubmitText}
        className="glass-card rounded-full flex items-center pl-5 pr-2 py-2 shadow-lg border border-white/30"
      >
        <input
          type="text"
          placeholder="Type your message..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted-foreground/70"
        />
        
        <div className="flex items-center gap-1">
          {/* PDF Upload button */}
          <label htmlFor="pdf-upload" className={`relative w-10 h-10 flex items-center justify-center rounded-full transition-colors ${isProcessingPdf ? 'text-primary/40' : 'hover:bg-primary/10 text-primary'}`}>
            <input 
              type="file" 
              id="pdf-upload" 
              accept="application/pdf" 
              onChange={handleFileUpload}
              disabled={isProcessingPdf}
              className="sr-only"
            />
            <File size={18} />
            {isProcessingPdf && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin"></div>
              </div>
            )}
          </label>
          
          {/* Voice input button */}
          <button
            type="button"
            onClick={toggleRecognition}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-primary/10 text-primary transition-colors"
            aria-label={isListening ? "Stop listening" : "Start listening"}
          >
            {isListening ? <StopCircle size={18} /> : <Mic size={18} />}
          </button>
          
          {/* Stop Speaking button (only visible when speaking) */}
          {speaking && (
            <button
              type="button"
              onClick={stopSpeaking}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-red-100 text-red-500 transition-colors"
              aria-label="Stop speaking"
            >
              <VolumeX size={18} />
            </button>
          )}
          
          {/* Send button */}
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="w-10 h-10 flex items-center justify-center bg-primary text-white rounded-full disabled:opacity-50 disabled:cursor-not-allowed hover:bg-primary/90 transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </form>
      
      {/* Status indicator */}
      {(isListening || speaking) && (
        <div className="text-xs text-center mt-2 text-primary animate-pulse flex items-center justify-center gap-1">
          {isListening && (
            <>
              <span className="inline-block w-2 h-2 bg-primary rounded-full animate-ping"></span>
              <span>Listening... Speak now</span>
            </>
          )}
          {speaking && (
            <>
              <Volume2 size={12} className="animate-pulse" />
              <span>Speaking... (click <VolumeX size={10} className="inline mx-1" /> to stop)</span>
            </>
          )}
        </div>
      )}
    </motion.div>
  );
};

export default ChatInput;
