
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
  const recognitionActiveRef = useRef<boolean>(false);

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
        recog.interimResults = true; // Enable interim results for better responsiveness
        recog.lang = "en-US";
        recog.maxAlternatives = 1;

        recog.onstart = () => {
          console.log("Speech recognition started...");
          setIsListening(true);
          recognitionActiveRef.current = true;
          toast.success("Voice recognition active", {
            description: "I'm listening to your question"
          });
        };

        recog.onresult = (event: any) => {
          const resultIndex = event.resultIndex;
          const transcript = event.results[resultIndex][0].transcript;
          const isFinal = event.results[resultIndex].isFinal;
          
          console.log("Speech recognition result:", transcript, "Final:", isFinal);
          
          if (isFinal) {
            // Only set recognized speech when we have a final result
            console.log("Final transcript:", transcript);
            setRecognizedSpeech(transcript);
          }
        };

        recog.onend = () => {
          console.log("Speech recognition stopped...");
          // Only update UI state if this wasn't triggered by a restart
          if (recognitionActiveRef.current) {
            setIsListening(false);
            recognitionActiveRef.current = false;
          } else if (isListening) {
            // Try to restart if it stopped unexpectedly
            try {
              console.log("Attempting to restart recognition...");
              recog.start();
              recognitionActiveRef.current = true;
            } catch (e) {
              console.error("Failed to restart recognition:", e);
              setIsListening(false);
            }
          }
        };

        recog.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          recognitionActiveRef.current = false;
          setIsListening(false);
          
          if (event.error === 'not-allowed') {
            toast.error("Microphone access denied", {
              description: "Please allow microphone access to use speech recognition"
            });
          } else if (event.error === 'network') {
            toast.error("Network error", {
              description: "Check your internet connection and try again"
            });
          } else {
            toast.error("Voice recognition error", {
              description: `${event.error || "Unknown error"}. Try again.`
            });
          }
        };

        setRecognition(recog);
      } catch (error) {
        console.error("Error initializing speech recognition:", error);
        toast.error("Voice recognition not available", {
          description: "Your browser may not support this feature"
        });
      }
    } else {
      console.warn("Speech Recognition is not supported in this browser.");
      toast.error("Voice recognition not supported", {
        description: "Please try using a modern browser like Chrome"
      });
    }
    
    // Cleanup
    return () => {
      if (recognition) {
        try {
          recognition.stop();
          recognitionActiveRef.current = false;
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
        
        // Pause recognition while speaking to prevent feedback loop
        if (isListening && recognition) {
          try {
            console.log("Pausing recognition while speaking");
            recognition.stop();
            recognitionActiveRef.current = false;
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
            console.log("Resuming recognition after speaking");
            recognition.start();
            recognitionActiveRef.current = true;
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
        
        // Resume recognition if it was paused due to speaking
        if (recognition && isListening && !recognitionActiveRef.current) {
          try {
            recognition.start();
            recognitionActiveRef.current = true;
          } catch (e) {
            console.error("Error restarting recognition after speech error:", e);
          }
        }
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
    const maxChunkSize = 250; // Characters - reduced for better responsiveness
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
    // Split at sentence boundaries (periods, exclamation marks, question marks)
    const sentences = text.split(/([.!?]+)/).filter(Boolean);
    const chunks: string[] = [];
    let currentChunk = "";
    
    for (let i = 0; i < sentences.length; i += 2) {
      const sentence = sentences[i] || "";
      const punctuation = sentences[i + 1] || "";
      const fullSentence = sentence + punctuation + " ";
      
      if (currentChunk.length + fullSentence.length > maxChunkSize) {
        chunks.push(currentChunk);
        currentChunk = fullSentence;
      } else {
        currentChunk += fullSentence;
      }
    }
    
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
    
    // Resume recognition if it was active but paused due to speaking
    if (recognition && isListening && !recognitionActiveRef.current) {
      try {
        recognition.start();
        recognitionActiveRef.current = true;
      } catch (e) {
        console.error("Error restarting recognition after stopping speech:", e);
      }
    }
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
        recognitionActiveRef.current = false;
        setIsListening(false);
        toast.success("Voice input turned off");
      } else {
        recognition.start();
        recognitionActiveRef.current = true;
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
