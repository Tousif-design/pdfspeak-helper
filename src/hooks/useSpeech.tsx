
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";

export interface UseSpeechReturn {
  speak: (text: string) => void;
  stopSpeaking: () => void;
  toggleRecognition: () => void;
  isListening: boolean;
  speaking: boolean;
  recognizedSpeech: string;
  setRecognizedSpeech: React.Dispatch<React.SetStateAction<string>>;
}

export function useSpeech(): UseSpeechReturn {
  const [speaking, setSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [recognizedSpeech, setRecognizedSpeech] = useState("");
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 3;

  function stopSpeaking(): void {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
    }
  }

  function cleanText(text: string): string {
    if (!text) return "";

    return text
      .replace(/google/gi, "Tousif")
      .replace(/satric/gi, "Tousif")
      .replace(/goolge/gi, "Tousif")
      .replace(/\*\*/g, "") // Removes double asterisks (**)
      .replace(/\*/g, "") // Removes single asterisks (*)
      .replace(/\*\)/g, "") // Removes `*)`
      .trim();
  }

  function speak(text: string): void {
    if (!text) return;
    console.log("Speaking:", text.substring(0, 50) + "...");

    stopSpeaking();

    let cleanedText = cleanText(text);
    
    const utterance = new SpeechSynthesisUtterance(cleanedText);
    utterance.volume = 1;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.lang = "en-US";
    utteranceRef.current = utterance;
    
    // Get available voices and select a suitable one
    const voices = window.speechSynthesis.getVoices();
    if (voices.length) {
      const englishVoice = voices.find(voice => 
        voice.lang.includes('en') && voice.name.includes('Female')
      ) || voices.find(voice => voice.lang.includes('en')) || voices[0];
      
      utterance.voice = englishVoice;
    }
    
    // Handle long texts by chunking
    if (cleanedText.length > 200) {
      const sentences = cleanedText.match(/[^.!?]+[.!?]+/g) || [];
      
      if (sentences.length > 3) {
        let chunks: string[] = [];
        let currentChunk = "";
        
        sentences.forEach(sentence => {
          if (currentChunk.length + sentence.length < 200) {
            currentChunk += sentence;
          } else {
            chunks.push(currentChunk);
            currentChunk = sentence;
          }
        });
        
        if (currentChunk) {
          chunks.push(currentChunk);
        }
        
        utterance.text = chunks[0];
        let chunkIndex = 1;
        
        utterance.onstart = () => {
          setSpeaking(true);
          if (isListening && recognition) {
            try {
              recognition.stop();
              setIsListening(false);
            } catch (error) {
              console.error("Error stopping recognition during speech:", error);
            }
          }
        };
        
        utterance.onend = () => {
          if (chunkIndex < chunks.length) {
            console.log(`Speaking chunk ${chunkIndex+1}/${chunks.length}`);
            const nextUtterance = new SpeechSynthesisUtterance(chunks[chunkIndex]);
            nextUtterance.volume = 1;
            nextUtterance.rate = 1.0;
            nextUtterance.pitch = 1.0;
            nextUtterance.voice = utterance.voice;
            utteranceRef.current = nextUtterance;
            
            nextUtterance.onend = utterance.onend;
            
            chunkIndex++;
            window.speechSynthesis.speak(nextUtterance);
          } else {
            setSpeaking(false);
            console.log("Finished speaking all chunks");
            
            // Wait a short delay before reactivating listening
            setTimeout(() => {
              if (recognition && !isListening) {
                try {
                  setIsListening(true);
                  recognition.start();
                  console.log("Reactivated listening after speech");
                } catch (error) {
                  console.error("Error restarting recognition after speech:", error);
                }
              }
            }, 500);
          }
        };
        
        window.speechSynthesis.speak(utterance);
        return;
      }
    }
    
    utterance.onstart = () => {
      setSpeaking(true);
      if (isListening && recognition) {
        try {
          recognition.stop();
          setIsListening(false);
        } catch (error) {
          console.error("Error stopping recognition during speech:", error);
        }
      }
    };

    utterance.onend = () => {
      setSpeaking(false);
      console.log("Speech ended, attempting to restart recognition");
      
      // Wait a short delay before reactivating listening
      setTimeout(() => {
        if (recognition && !isListening) {
          try {
            setIsListening(true);
            recognition.start();
            console.log("Recognition restarted after speech end");
          } catch (error) {
            console.error("Error restarting recognition after speech:", error);
            resetRecognition();
          }
        }
      }, 500);
    };

    try {
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error("Error during speech synthesis:", error);
      setSpeaking(false);
      toast.error("Speech synthesis error", {
        description: "Unable to speak the response"
      });
    }
  }

  // Function to reset and recreate recognition
  function resetRecognition() {
    if (recognition) {
      try {
        recognition.stop();
      } catch (e) {
        console.log("Error stopping recognition during reset:", e);
      }
    }
    
    reconnectAttemptsRef.current += 1;
    if (reconnectAttemptsRef.current <= maxReconnectAttempts) {
      console.log(`Attempting to reset recognition (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
      setupSpeechRecognition();
    } else {
      console.error("Max reconnection attempts reached");
      toast.error("Voice recognition unavailable", {
        description: "Please refresh the page to try again"
      });
    }
  }

  // Initialize voices and speech synthesis
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          console.log(`${voices.length} voices loaded`);
        }
      };
      
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
      
      // Periodically check speech synthesis state
      const intervalId = setInterval(() => {
        if (speaking && utteranceRef.current) {
          if (window.speechSynthesis.paused) {
            console.log("Speech synthesis was paused, resuming...");
            window.speechSynthesis.resume();
          }
        }
      }, 1000);
      
      return () => {
        clearInterval(intervalId);
      };
    }
  }, [speaking]);

  // Setup speech recognition
  useEffect(() => {
    setupSpeechRecognition();
    
    return () => {
      if (recognition) {
        try {
          recognition.stop();
        } catch (error) {
          console.error("Error stopping recognition on cleanup:", error);
        }
      }
      
      stopSpeaking();
    };
  }, []);

  function setupSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = "en-US";
      recognitionInstance.maxAlternatives = 1;

      recognitionInstance.onstart = () => {
        console.log("Speech recognition started...");
        setIsListening(true);
        reconnectAttemptsRef.current = 0; // Reset counter on successful start
      };

      recognitionInstance.onresult = (event) => {
        const finalSpeech = event.results[event.results.length - 1][0].transcript;
        console.log("Recognized speech:", finalSpeech);
        
        setRecognizedSpeech(finalSpeech);
      };

      recognitionInstance.onend = () => {
        console.log("Speech recognition stopped...");
        setIsListening(false);
        
        if (!speaking) {
          setTimeout(() => {
            if (!speaking) {
              try {
                recognitionInstance.start();
                console.log("Auto-restarting recognition after end");
              } catch (error) {
                console.error("Failed to auto-restart recognition:", error);
                resetRecognition();
              }
            }
          }, 1000);
        }
      };

      recognitionInstance.onerror = (event) => {
        console.error("Recognition error:", event.error);
        
        // Handle various error types
        if (event.error === 'not-allowed') {
          toast.error("Microphone access denied", { 
            description: "Please allow microphone access in your browser settings" 
          });
        } else if (event.error !== 'aborted') {
          toast.error("Voice recognition error", { 
            description: "Please try again or type your question" 
          });
          resetRecognition();
        }
      };

      setRecognition(recognitionInstance);
      
      try {
        recognitionInstance.start();
        console.log("Initial recognition start attempt");
      } catch (error) {
        console.error("Error during initial recognition start:", error);
        setTimeout(() => {
          try {
            recognitionInstance.start();
            console.log("Retry recognition start after delay");
          } catch (retryError) {
            console.error("Retry recognition start failed:", retryError);
          }
        }, 1000);
      }
    } else {
      console.warn("Speech Recognition is not supported in this browser.");
      toast.error("Voice features unavailable", { 
        description: "Your browser doesn't support speech recognition" 
      });
    }
  }

  function toggleRecognition(): void {
    if (!recognition) {
      toast.error("Speech recognition not available", {
        description: "Your browser may not support this feature"
      });
      return;
    }
    
    if (isListening) {
      console.log("Manually stopping recognition...");
      try {
        recognition.stop();
        setIsListening(false);
        toast.success("Voice recognition paused");
      } catch (error) {
        console.error("Error stopping recognition:", error);
      }
    } else {
      console.log("Manually starting recognition...");
      try {
        recognition.start();
        setIsListening(true);
        toast.success("Voice recognition activated");
      } catch (error) {
        console.error("Error starting recognition:", error);
        
        if (error instanceof DOMException && error.name === 'InvalidStateError') {
          setIsListening(true);
          toast.info("Recognition is already active");
        } else {
          resetRecognition();
        }
      }
    }
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
