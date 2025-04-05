
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
  const maxReconnectAttempts = 5;
  const speechQueueRef = useRef<string[]>([]);
  const isSpeakingRef = useRef(false);

  function stopSpeaking(): void {
    if (speaking) {
      window.speechSynthesis.cancel();
      setSpeaking(false);
      isSpeakingRef.current = false;
      speechQueueRef.current = [];
      console.log("Speech stopped by user");
    }
  }

  function cleanText(text: string): string {
    if (!text) return "";

    return text
      .replace(/google/gi, "Assistant")
      .replace(/satric/gi, "Assistant")
      .replace(/goolge/gi, "Assistant")
      .replace(/\*\*/g, "") // Removes double asterisks (**)
      .replace(/\*/g, "") // Removes single asterisks (*)
      .replace(/\*\)/g, "") // Removes `*)`
      .trim();
  }

  function speak(text: string): void {
    if (!text) return;
    console.log("Speaking request:", text.substring(0, 50) + "...");
    
    // Add to queue and process
    speechQueueRef.current.push(text);
    processSpeechQueue();
  }
  
  function processSpeechQueue(): void {
    // If already speaking or queue is empty, don't do anything
    if (isSpeakingRef.current || speechQueueRef.current.length === 0) {
      return;
    }
    
    // Get the next text to speak
    const text = speechQueueRef.current.shift();
    if (!text) return;
    
    console.log("Processing speech from queue:", text.substring(0, 50) + "...");
    isSpeakingRef.current = true;
    setSpeaking(true);
    
    // If recognition is active, stop it while speaking
    if (isListening && recognition) {
      try {
        recognition.stop();
        setIsListening(false);
        console.log("Paused recognition for speech");
      } catch (error) {
        console.error("Error stopping recognition:", error);
      }
    }

    let cleanedText = cleanText(text);
    
    // Create new utterance
    const utterance = new SpeechSynthesisUtterance(cleanedText);
    utterance.volume = 1;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.lang = "en-US";
    utteranceRef.current = utterance;
    
    // Get available voices and select a suitable one
    let voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) {
      // If voices aren't loaded yet, wait for them
      window.speechSynthesis.onvoiceschanged = () => {
        voices = window.speechSynthesis.getVoices();
        selectVoice(utterance, voices);
        console.log("Voices loaded after wait:", voices.length);
      };
    } else {
      selectVoice(utterance, voices);
    }
    
    function selectVoice(utterance: SpeechSynthesisUtterance, voices: SpeechSynthesisVoice[]) {
      if (voices.length) {
        // Try to find a good English female voice
        const englishVoice = voices.find(voice => 
          voice.lang.includes('en') && voice.name.includes('Female')
        ) || voices.find(voice => 
          voice.lang.includes('en')
        ) || voices[0];
        
        utterance.voice = englishVoice;
        console.log("Selected voice:", englishVoice.name);
      }
    }
    
    // Handle long texts by chunking
    if (cleanedText.length > 150) {
      const sentences = cleanedText.match(/[^.!?]+[.!?]+/g) || [];
      
      if (sentences.length > 3) {
        let chunks: string[] = [];
        let currentChunk = "";
        
        sentences.forEach(sentence => {
          if (currentChunk.length + sentence.length < 150) {
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
        
        utterance.onend = () => {
          if (chunkIndex < chunks.length) {
            console.log(`Speaking chunk ${chunkIndex+1}/${chunks.length}`);
            const nextUtterance = new SpeechSynthesisUtterance(chunks[chunkIndex]);
            nextUtterance.volume = utterance.volume;
            nextUtterance.rate = utterance.rate;
            nextUtterance.pitch = utterance.pitch;
            nextUtterance.voice = utterance.voice;
            utteranceRef.current = nextUtterance;
            
            if (chunkIndex === chunks.length - 1) {
              // This is the last chunk
              nextUtterance.onend = () => {
                finishSpeaking();
              };
            } else {
              nextUtterance.onend = utterance.onend;
            }
            
            chunkIndex++;
            window.speechSynthesis.speak(nextUtterance);
          } else {
            finishSpeaking();
          }
        };
        
        console.log("Starting to speak chunked text");
        window.speechSynthesis.speak(utterance);
        return;
      }
    }
    
    // For shorter texts
    utterance.onend = () => {
      finishSpeaking();
    };

    try {
      console.log("Speaking now...");
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error("Error during speech synthesis:", error);
      finishSpeaking();
      toast.error("Speech synthesis error", {
        description: "Unable to speak the response"
      });
    }
  }
  
  function finishSpeaking(): void {
    console.log("Speech finished");
    setSpeaking(false);
    isSpeakingRef.current = false;
    
    // Restart recognition if it was active before
    if (!isListening && recognition) {
      setTimeout(() => {
        try {
          recognition.start();
          setIsListening(true);
          console.log("Reactivated listening after speech");
        } catch (error) {
          console.error("Error restarting recognition after speech:", error);
          resetRecognition();
        }
      }, 500);
    }
    
    // Process any remaining items in the queue
    if (speechQueueRef.current.length > 0) {
      setTimeout(() => {
        processSpeechQueue();
      }, 300);
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
      // Preload voices
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        console.log(`Initial voices loaded: ${voices.length}`);
      }
      
      window.speechSynthesis.onvoiceschanged = () => {
        const updatedVoices = window.speechSynthesis.getVoices();
        console.log(`Updated voices loaded: ${updatedVoices.length}`);
      };
      
      // Fix Chrome bug where speech synthesis gets paused
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
        window.speechSynthesis.cancel(); // Make sure to cancel any speech on cleanup
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
        
        // Only set speech if we're not currently speaking
        if (!speaking) {
          setRecognizedSpeech(finalSpeech);
        } else {
          console.log("Speech recognition ignored while speaking");
        }
      };

      recognitionInstance.onend = () => {
        console.log("Speech recognition stopped...");
        setIsListening(false);
        
        if (!speaking) {
          setTimeout(() => {
            if (!speaking && !isSpeakingRef.current) {
              try {
                recognitionInstance.start();
                console.log("Auto-restarting recognition after end");
                setIsListening(true);
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
