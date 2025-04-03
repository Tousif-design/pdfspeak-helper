
import React, { useContext } from "react";
import { motion } from "framer-motion";
import { DataContext } from "../context/UserContext.tsx";
import { Upload, Mic, MicOff } from "lucide-react";

const Hero = () => {
  const context = useContext(DataContext);
  
  // Add a check for undefined context
  if (!context) {
    return <div className="py-12 bg-gradient-to-b from-primary/10 to-transparent">
      <div className="container mx-auto px-4">
        <h1 className="text-2xl md:text-3xl font-bold text-center">Loading...</h1>
      </div>
    </div>;
  }
  
  const { 
    toggleRecognition, 
    isListening, 
    handleFileUpload, 
    isProcessingPdf,
    pdfName
  } = context;

  return (
    <div className="py-12 bg-gradient-to-b from-primary/10 to-transparent">
      <div className="container mx-auto px-4">
        <h1 className="text-2xl md:text-3xl font-bold text-center">
          Your intelligent PDF analyzer and educational companion. Upload a document,
          ask questions, create tests, or practice with interview simulations.
        </h1>
        
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => document.getElementById('pdf-upload')?.click()}
            disabled={isProcessingPdf}
            className="flex items-center gap-2 bg-white px-6 py-3 rounded-full shadow-md hover:shadow-lg transition-all"
          >
            <Upload className="w-5 h-5 text-primary" />
            <span className="font-medium">{pdfName ? pdfName : "Resume2.pdf"}</span>
            <input 
              type="file" 
              id="pdf-upload" 
              accept="application/pdf" 
              onChange={handleFileUpload}
              disabled={isProcessingPdf}
              className="sr-only"
            />
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggleRecognition}
            className={`flex items-center gap-2 px-6 py-3 rounded-full shadow-md hover:shadow-lg transition-all
                      ${isListening ? "bg-red-500 text-white" : "bg-white text-primary"}`}
          >
            {isListening ? 
              <><MicOff className="w-5 h-5" /> <span className="font-medium">Stop Listening</span></> : 
              <><Mic className="w-5 h-5" /> <span className="font-medium">Start Listening</span></>
            }
          </motion.button>
        </div>
      </div>
    </div>
  );
};

export default Hero;
