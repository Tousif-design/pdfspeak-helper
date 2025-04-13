
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
          if (recognition) {
            try {
              recognition.stop();
              setTimeout(() => {
                if (isListening) {
                  recognition.start();
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
        setIsListening(false);
        
        // Restart if it should be continuous
        if (continuous && isListening) {
          try {
            recognitionInstance.start();
          } catch (error) {
            console.error("Error restarting continuous recognition:", error);
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
  }, [continuous, language, onSpeechRecognized]);
  
  // Toggle recognition
  const toggleRecognition = useCallback(() => {
    if (!recognition) return;
    
    try {
      if (isListening) {
        recognition.stop();
      } else {
        recognition.start();
      }
    } catch (error) {
      console.error("Error toggling speech recognition:", error);
      setErrorMessage("Failed to toggle speech recognition");
    }
  }, [recognition, isListening]);

  // Start recognition
  const startRecognition = useCallback(() => {
    if (!recognition || isListening) return;
    
    try {
      recognition.start();
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
