
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";

export function useSpeech() {
  const [speaking, setSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [recognizedSpeech, setRecognizedSpeech] = useState("");
  const speechQueueRef = useRef<string[]>([]);
  const isSpeakingRef = useRef<boolean>(false);
  const speechSynthesisRef = useRef<SpeechSynthesis | null>(null);

  // Initialize speech recognition and synthesis
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Initialize speech synthesis
    speechSynthesisRef.current = window.speechSynthesis;
    
    // Check if speech synthesis is available
    if (!speechSynthesisRef.current) {
      console.warn("Speech synthesis not supported in this browser");
    } else {
      console.log("Speech synthesis initialized");
      
      // Pre-warm the speech synthesis
      const utterance = new SpeechSynthesisUtterance("");
      speechSynthesisRef.current.speak(utterance);
    }
    
    // Initialize speech recognition
    let SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      try {
        let recog = new SpeechRecognition();
        recog.continuous = true;
        recog.interimResults = false;
        recog.lang = "en-US";
        recog.maxAlternatives = 1;

        recog.onstart = () => {
          console.log("Speech recognition started...");
          setIsListening(true);
        };

        recog.onresult = (event: any) => {
          let transcript = event.results[event.results.length - 1][0].transcript;
          console.log("Recognized Speech:", transcript);
          setRecognizedSpeech(transcript);
        };

        recog.onend = () => {
          console.log("Speech recognition stopped...");
          setIsListening(false);
        };

        recog.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          setIsListening(false);
          if (event.error === 'not-allowed') {
            toast.error("Microphone access denied", {
              description: "Please allow microphone access to use speech recognition"
            });
          }
        };

        setRecognition(recog);
      } catch (error) {
        console.error("Error initializing speech recognition:", error);
      }
    } else {
      console.warn("Speech Recognition is not supported in this browser.");
    }
    
    // Cleanup
    return () => {
      if (recognition) {
        try {
          recognition.stop();
        } catch (e) {
          console.error("Error stopping recognition during cleanup:", e);
        }
      }
      
      if (speechSynthesisRef.current) {
        speechSynthesisRef.current.cancel();
      }
    };
  }, []);

  // Function to manage the speech queue
  const processSpeechQueue = () => {
    if (speechQueueRef.current.length > 0 && !isSpeakingRef.current) {
      const nextText = speechQueueRef.current.shift();
      if (nextText) {
        speakText(nextText);
      }
    }
  };

  // Actual speak function that handles the direct speech synthesis
  const speakText = (text: string) => {
    if (!text || !speechSynthesisRef.current) return;
    
    try {
      // Clean the text
      const cleanedText = cleanText(text);
      
      // Create speech synthesis utterance
      let utterance = new SpeechSynthesisUtterance(cleanedText);
      utterance.volume = 1;
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.lang = "en-US";
      
      // Set up the callbacks
      utterance.onstart = () => {
        console.log("Started speaking...");
        isSpeakingRef.current = true;
        setSpeaking(true);
        
        // Pause recognition while speaking
        if (isListening && recognition) {
          try {
            recognition.stop();
          } catch (e) {
            console.error("Error stopping recognition:", e);
          }
        }
      };
      
      utterance.onend = () => {
        console.log("Finished speaking.");
        isSpeakingRef.current = false;
        setSpeaking(false);
        
        // Resume recognition if it was active
        if (recognition && isListening) {
          try {
            recognition.start();
          } catch (e) {
            console.error("Error restarting recognition:", e);
          }
        }
        
        // Process the next item in queue
        setTimeout(() => processSpeechQueue(), 300);
      };
      
      utterance.onerror = (event) => {
        console.error("Speech synthesis error:", event);
        isSpeakingRef.current = false;
        setSpeaking(false);
        
        // Process the next item even on error
        setTimeout(() => processSpeechQueue(), 300);
      };
      
      // Speak the text
      speechSynthesisRef.current.speak(utterance);
      
      // Safari and some mobile browsers may need manual resume
      if (speechSynthesisRef.current.paused) {
        speechSynthesisRef.current.resume();
      }
    } catch (error) {
      console.error("Error in speech synthesis:", error);
      isSpeakingRef.current = false;
      setSpeaking(false);
      setTimeout(() => processSpeechQueue(), 300);
    }
  };

  // Public speak function that adds to the queue
  const speak = (text: string) => {
    if (!text) return;
    
    // Check if speech synthesis is available
    if (!speechSynthesisRef.current) {
      console.warn("Speech synthesis not available");
      return;
    }
    
    // Split very long text into smaller chunks for better performance
    const maxChunkSize = 500; // Characters - reduced for better responsiveness
    if (text.length > maxChunkSize) {
      const chunks = splitTextIntoChunks(text, maxChunkSize);
      console.log(`Split text into ${chunks.length} chunks for speaking`);
      chunks.forEach(chunk => speechQueueRef.current.push(chunk));
    } else {
      speechQueueRef.current.push(text);
    }
    
    // Start processing the queue if not already speaking
    if (!isSpeakingRef.current) {
      console.log("Starting speech queue processing");
      processSpeechQueue();
    } else {
      console.log("Already speaking, text added to queue");
    }
  };

  // Split text into chunks at sentence boundaries
  const splitTextIntoChunks = (text: string, maxChunkSize: number): string[] => {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const chunks: string[] = [];
    let currentChunk = "";
    
    sentences.forEach(sentence => {
      // Add period back to sentence
      const fullSentence = sentence.trim() + ". ";
      
      if (currentChunk.length + fullSentence.length > maxChunkSize) {
        chunks.push(currentChunk);
        currentChunk = fullSentence;
      } else {
        currentChunk += fullSentence;
      }
    });
    
    if (currentChunk.length > 0) {
      chunks.push(currentChunk);
    }
    
    return chunks;
  };

  // Stop speaking immediately
  const stopSpeaking = () => {
    speechQueueRef.current = []; // Clear the queue
    if (speechSynthesisRef.current) {
      speechSynthesisRef.current.cancel();
    }
    isSpeakingRef.current = false;
    setSpeaking(false);
    console.log("Speech stopped and queue cleared");
    
    // Notify user
    toast.success("Voice stopped", {
      description: "Speech has been cancelled"
    });
  };

  // Toggle speech recognition
  const toggleRecognition = () => {
    if (!recognition) {
      toast.error("Speech recognition not available", {
        description: "This feature may not be supported in your browser"
      });
      return;
    }
    
    try {
      if (isListening) {
        recognition.stop();
        setIsListening(false);
        toast.success("Voice input turned off");
      } else {
        recognition.start();
        setIsListening(true);
        toast.success("Voice input turned on", {
          description: "Speak now to ask questions"
        });
      }
    } catch (error) {
      console.error("Error toggling recognition:", error);
      toast.error("Speech recognition error", {
        description: "There was a problem with the speech recognition service"
      });
    }
  };

  // Clean text for better speaking
  function cleanText(text: string): string {
    if (!text) return "";
    
    return text
      .replace(/\*\*/g, "") // Remove markdown bold
      .replace(/\*/g, "")    // Remove markdown italic
      .replace(/#+\s/g, "")  // Remove markdown headings
      .replace(/\n\s*\n/g, ". ") // Replace double line breaks with period and space
      .replace(/\n/g, " ")   // Replace single line breaks with space
      .replace(/\s{2,}/g, " ") // Replace multiple spaces with a single space
      .trim();
  }

  return {
    speak,
    stopSpeaking,
    toggleRecognition,
    isListening,
    speaking,
    recognizedSpeech,
    setRecognizedSpeech
  };
}
