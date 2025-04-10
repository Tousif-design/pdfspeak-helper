
import { useState, useEffect, useCallback } from 'react';

interface UseSpeechRecognitionProps {
  onSpeechRecognized?: (text: string) => void;
  autoStart?: boolean;
  continuous?: boolean;
  language?: string;
}

export function useSpeechRecognition({
  onSpeechRecognized,
  autoStart = false,
  continuous = true,
  language = 'en-US'
}: UseSpeechRecognitionProps = {}) {
  const [isListening, setIsListening] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [isSupported, setIsSupported] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // Initialize speech recognition
  useEffect(() => {
    // Check if browser supports speech recognition
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        console.warn("Speech recognition is not supported in this browser");
        setIsSupported(false);
        setErrorMessage("Your browser doesn't support speech recognition");
        return;
      }
      
      try {
        const recognitionInstance = new SpeechRecognition();
        recognitionInstance.continuous = continuous;
        recognitionInstance.interimResults = false; 
        recognitionInstance.lang = language;
        recognitionInstance.maxAlternatives = 1;
        
        recognitionInstance.onstart = () => {
          console.log("Speech recognition started");
          setIsListening(true);
        };
        
        recognitionInstance.onresult = (event) => {
          const transcript = event.results[event.results.length - 1][0].transcript;
          console.log("Speech recognized:", transcript);
          setRecognizedText(transcript);
          
          if (onSpeechRecognized) {
            onSpeechRecognized(transcript);
          }
        };
        
        recognitionInstance.onerror = (event) => {
          console.error("Speech recognition error:", event.error);
          setErrorMessage(`Recognition error: ${event.error}`);
          
          // Don't stop listening on no-speech error, retry instead
          if (event.error === 'no-speech') {
            if (recognitionInstance) {
              try {
                recognitionInstance.stop();
                setTimeout(() => {
                  if (isListening) {
                    recognitionInstance.start();
                  }
                }, 100);
              } catch (e) {
                console.error("Error restarting recognition after no-speech:", e);
              }
            }
          } else {
            setIsListening(false);
          }
        };
        
        recognitionInstance.onend = () => {
          console.log("Speech recognition ended");
          
          // Only update state if we're not in the process of restarting
          if (isListening) {
            // Don't immediately set isListening to false
            // Instead, check if we should restart
            if (continuous) {
              try {
                setTimeout(() => {
                  recognitionInstance.start();
                }, 300);
              } catch (error) {
                console.error("Error restarting continuous recognition:", error);
                setIsListening(false);
              }
            } else {
              setIsListening(false);
            }
          }
        };
        
        setRecognition(recognitionInstance);
        
        // Auto-start if requested
        if (autoStart) {
          try {
            recognitionInstance.start();
          } catch (error) {
            console.error("Error auto-starting speech recognition:", error);
          }
        }
      } catch (error) {
        console.error("Error setting up speech recognition:", error);
        setIsSupported(false);
        setErrorMessage("Failed to initialize speech recognition");
      }
    }
    
    // Cleanup
    return () => {
      if (recognition) {
        try {
          recognition.stop();
        } catch (error) {
          console.error("Error stopping speech recognition during cleanup:", error);
        }
      }
    };
  }, [continuous, language, onSpeechRecognized, isListening]);
  
  // Toggle recognition
  const toggleRecognition = useCallback(() => {
    if (!recognition) return;
    
    try {
      if (isListening) {
        recognition.stop();
        setIsListening(false);
      } else {
        recognition.start();
        setIsListening(true);
      }
    } catch (error) {
      console.error("Error toggling speech recognition:", error);
      setErrorMessage("Failed to toggle speech recognition");
      // Reset state on error
      setIsListening(false);
    }
  }, [recognition, isListening]);

  // Start recognition
  const startRecognition = useCallback(() => {
    if (!recognition || isListening) return;
    
    try {
      recognition.start();
      setIsListening(true);
    } catch (error) {
      console.error("Error starting speech recognition:", error);
      setErrorMessage("Failed to start speech recognition");
    }
  }, [recognition, isListening]);

  // Stop recognition
  const stopRecognition = useCallback(() => {
    if (!recognition || !isListening) return;
    
    try {
      recognition.stop();
      setIsListening(false);
    } catch (error) {
      console.error("Error stopping speech recognition:", error);
      setErrorMessage("Failed to stop speech recognition");
    }
  }, [recognition, isListening]);

  // Reset error state
  const resetError = useCallback(() => {
    setErrorMessage('');
  }, []);

  return {
    isListening,
    recognizedText,
    isSupported,
    errorMessage,
    toggleRecognition,
    startRecognition,
    stopRecognition,
    resetError
  };
}

export default useSpeechRecognition;
