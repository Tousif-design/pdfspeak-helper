
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
    
    const voices = window.speechSynthesis.getVoices();
    if (voices.length) {
      const englishVoice = voices.find(voice => 
        voice.lang.includes('en') && voice.name.includes('Female')
      ) || voices.find(voice => voice.lang.includes('en')) || voices[0];
      
      utterance.voice = englishVoice;
    }
    
    if (cleanedText.length > 500) {
      const sentences = cleanedText.match(/[^.!?]+[.!?]+/g) || [];
      
      if (sentences.length > 5) {
        let chunks: string[] = [];
        let currentChunk = "";
        
        sentences.forEach(sentence => {
          if (currentChunk.length + sentence.length < 500) {
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
            recognition.stop();
            setIsListening(false);
          }
        };
        
        utterance.onend = () => {
          if (chunkIndex < chunks.length) {
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
            
            if (recognition && !isListening) {
              try {
                setIsListening(true);
                recognition.start();
              } catch (error) {
                console.error("Error restarting recognition:", error);
              }
            }
          }
        };
        
        window.speechSynthesis.speak(utterance);
        return;
      }
    }
    
    utterance.onstart = () => {
      setSpeaking(true);
      if (isListening && recognition) {
        recognition.stop();
        setIsListening(false);
      }
    };

    utterance.onend = () => {
      setSpeaking(false);
      if (recognition && !isListening) {
        try {
          setIsListening(true);
          recognition.start();
        } catch (error) {
          console.error("Error restarting recognition:", error);
          if (recognition) {
            recognition.stop();
            setTimeout(() => {
              setIsListening(true);
              try {
                recognition.start();
              } catch (innerError) {
                console.error("Failed to restart recognition after timeout:", innerError);
              }
            }, 300);
          }
        }
      }
    };

    window.speechSynthesis.speak(utterance);
  }

  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices.length > 0) {
          console.log("Voices loaded:", voices.length);
        }
      };
      
      loadVoices();
      
      window.speechSynthesis.onvoiceschanged = loadVoices;
      
      const speechSynthesisUtteranceChunkSize = 150;
      const originalSpeechSynthesisSpeak = window.speechSynthesis.speak;
      
      window.speechSynthesis.speak = function(utterance) {
        originalSpeechSynthesisSpeak.call(window.speechSynthesis, utterance);
      };
    }
  }, []);

  useEffect(() => {
    let cleanup = false;
    
    const safelyStartRecognition = (rec: SpeechRecognition) => {
      if (cleanup) return;
      
      try {
        if (rec.state !== 'active') {
          rec.start();
          console.log("Speech recognition started");
          setIsListening(true);
        }
      } catch (error) {
        console.error("Error starting recognition:", error);
        if (!(error instanceof DOMException && error.name === 'InvalidStateError')) {
          toast.error("Voice recognition error", { 
            description: "Please try again or type your question" 
          });
        }
      }
    };
    
    function setupSpeechRecognition() {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition && !cleanup) {
        const recognitionInstance = new SpeechRecognition();
        recognitionInstance.continuous = true;
        recognitionInstance.interimResults = false;
        recognitionInstance.lang = "en-US";
        recognitionInstance.maxAlternatives = 1;
  
        recognitionInstance.onstart = () => {
          console.log("Speech recognition started...");
          setIsListening(true);
        };
  
        recognitionInstance.onresult = (event) => {
          const finalSpeech = event.results[event.results.length - 1][0].transcript;
          console.log("Recognized speech:", finalSpeech);
          
          setRecognizedSpeech(finalSpeech);
        };
  
        recognitionInstance.onend = () => {
          console.log("Speech recognition stopped...");
          setIsListening(false);
          
          if (!cleanup && !speaking) {
            setTimeout(() => {
              if (!cleanup && !speaking) {
                safelyStartRecognition(recognitionInstance);
              }
            }, 1000);
          }
        };
  
        recognitionInstance.onerror = (event) => {
          console.error("Recognition error:", event.error);
          
          if (event.error !== 'aborted' && !cleanup) {
            toast.error("Voice recognition error", { 
              description: "Please try again or type your question" 
            });
          }
        };
  
        setRecognition(recognitionInstance);
        
        setTimeout(() => {
          if (!cleanup) {
            safelyStartRecognition(recognitionInstance);
          }
        }, 1000);
      } else if (!SpeechRecognition) {
        console.warn("Speech Recognition is not supported in this browser.");
        if (!cleanup) {
          toast.error("Voice features unavailable", { 
            description: "Your browser doesn't support speech recognition" 
          });
        }
      }
    }
    
    setupSpeechRecognition();
    
    return () => {
      cleanup = true;
      if (recognition) {
        try {
          recognition.stop();
        } catch (error) {
          console.error("Error stopping recognition on cleanup:", error);
        }
      }
      
      stopSpeaking();
    };
  }, [speaking]);

  function toggleRecognition(): void {
    if (!recognition) {
      toast.error("Speech recognition not available", {
        description: "Your browser may not support this feature"
      });
      return;
    }
    
    if (isListening) {
      console.log("Stopping recognition...");
      try {
        recognition.stop();
        setIsListening(false);
      } catch (error) {
        console.error("Error stopping recognition:", error);
      }
    } else {
      console.log("Starting recognition...");
      try {
        recognition.start();
        setIsListening(true);
      } catch (error) {
        console.error("Error starting recognition:", error);
        
        if (error instanceof DOMException && error.name === 'InvalidStateError') {
          setIsListening(true);
        } else {
          toast.error("Couldn't start voice recognition", {
            description: "Please try again"
          });
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
