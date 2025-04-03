import React, { createContext, useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { extractTextFromPdf } from "../lib/pdfUtils";
import { 
  analyzePdfContent, 
  answerQuestionFromPdf,
  generateMockTest,
  prepareInterviewQuestions,
  evaluateInterviewResponse,
  getNextInterviewQuestion,
  runQuery
} from "../lib/geminiHelpers";

interface UserContextType {
  speak: (text: string) => void;
  stopSpeaking: () => void;
  toggleRecognition: () => void;
  isListening: boolean;
  speaking: boolean;
  userQuery: string;
  aiResponse: string;
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  isProcessingPdf: boolean;
  isPdfAnalyzed: boolean;
  pdfContent: string;
  pdfName: string;
  pdfAnalysis: string;
  mockTest: string;
  mockTestAnswers: string[];
  userAnswers: string[];
  testScore: number | null;
  handleTestSubmit: (answers: string[]) => number;
  interviewQuestions: string[];
  currentInterviewQuestion: string;
  currentQuestionIndex: number;
  interviewMode: boolean;
  interviewFeedback: string;
  interviewScore: number | null;
  startInterviewWithCamera: () => Promise<void>;
  stopInterview: () => void;
  answerInterviewQuestion: (answer: string) => Promise<void>;
  evaluateInterviewScore: () => Promise<number>;
  cameraActive: boolean;
  videoRef: React.RefObject<HTMLVideoElement>;
  inputText: string;
  setInputText: React.Dispatch<React.SetStateAction<string>>;
  handleSubmitText: (e: React.FormEvent) => void;
  prepareInterviewQuestionsFromPdf: () => Promise<string[]>;
  setInterviewQuestions: React.Dispatch<React.SetStateAction<string[]>>;
  recognizedSpeech: string;
  setRecognizedSpeech: React.Dispatch<React.SetStateAction<string>>;
}

const DataContext = createContext<UserContextType | null>(null);

function UserContext({ children }: { children: React.ReactNode }) {
  const [speaking, setSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [recognizedSpeech, setRecognizedSpeech] = useState("");
  
  const [userQuery, setUserQuery] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [inputText, setInputText] = useState("");
  
  const [pdfContent, setPdfContent] = useState("");
  const [pdfName, setPdfName] = useState("");
  const [pdfAnalysis, setPdfAnalysis] = useState("");
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [isPdfAnalyzed, setIsPdfAnalyzed] = useState(false);
  
  const [mockTest, setMockTest] = useState("");
  const [mockTestAnswers, setMockTestAnswers] = useState<string[]>([]);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [testScore, setTestScore] = useState<number | null>(null);
  const [interviewQuestions, setInterviewQuestions] = useState<string[]>([]);
  const [currentInterviewQuestion, setCurrentInterviewQuestion] = useState("");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [interviewMode, setInterviewMode] = useState(false);
  const [interviewFeedback, setInterviewFeedback] = useState("");
  const [interviewScore, setInterviewScore] = useState<number | null>(null);
  
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
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

  async function aiResponseHandler(prompt: string): Promise<void> {
    try {
      console.log("User Question:", prompt);
      setUserQuery(prompt);
      setAiResponse("Thinking... 🤔");

      if (prompt.toLowerCase().includes("stop") || 
          prompt.toLowerCase().includes("cancel") ||
          prompt.toLowerCase().includes("quiet") ||
          prompt.toLowerCase().includes("shut up")) {
        stopSpeaking();
        setAiResponse("I've stopped speaking as requested.");
        return;
      }

      const isPdfSummaryRequest = 
        (prompt.toLowerCase().includes("summarize") || 
         prompt.toLowerCase().includes("summary") ||
         prompt.toLowerCase().includes("explain") ||
         prompt.toLowerCase().includes("tell me about")) && 
        (prompt.toLowerCase().includes("pdf") || 
         prompt.toLowerCase().includes("document") ||
         prompt.toLowerCase().includes("content") ||
         prompt.toLowerCase().includes("file") ||
         prompt.toLowerCase().includes("it"));

      if (isPdfSummaryRequest && !pdfContent) {
        const noPdfMessage = "Please provide me with a PDF! I need the content of a PDF to summarize it for you.";
        setAiResponse(noPdfMessage);
        speak(noPdfMessage);
        return;
      }

      let response;
      
      if (pdfContent) {
        const isPdfQuery = 
          isPdfSummaryRequest || 
          prompt.toLowerCase().includes("pdf") || 
          prompt.toLowerCase().includes("document") ||
          prompt.toLowerCase().includes("analyze") ||
          prompt.toLowerCase().includes("content") ||
          prompt.toLowerCase().includes("about the") ||
          prompt.toLowerCase().includes("what does the") ||
          prompt.toLowerCase().includes("tell me about") ||
          prompt.toLowerCase().includes("summarize") ||
          prompt.toLowerCase().includes("what is") ||
          prompt.toLowerCase().includes("how does") ||
          prompt.toLowerCase().includes("explain") ||
          !prompt.toLowerCase().includes("test") && 
          !prompt.toLowerCase().includes("interview") &&
          !prompt.toLowerCase().includes("quiz");
        
        if (isPdfQuery) {
          if (isPdfSummaryRequest) {
            if (pdfAnalysis) {
              response = pdfAnalysis;
            } else {
              response = await analyzePdfContent(pdfContent);
              setPdfAnalysis(response);
            }
          } else {
            response = await answerQuestionFromPdf(prompt, pdfContent);
          }
        } else if (prompt.toLowerCase().includes("test") || 
                  prompt.toLowerCase().includes("quiz") || 
                  prompt.toLowerCase().includes("exam")) {
          console.log("Generating mock test");
          response = await generateMockTest(pdfContent, "comprehensive", 10, "mixed");
          setMockTest(response);
          
          const answerSection = response.match(/ANSWERS[\s\S]*$/i);
          if (answerSection) {
            const answers = answerSection[0].match(/\d+\.\s*([A-D]|.+)/g) || [];
            setMockTestAnswers(answers.map(a => a.trim()));
          }
        } else {
          console.log("Using regular query");
          response = await runQuery(prompt);
        }
      } else {
        console.log("No PDF available, using regular query");
        response = await runQuery(prompt);
      }
      
      const cleanedResponse = cleanText(response);

      console.log("AI Response:", cleanedResponse.substring(0, 100) + "...");
      setAiResponse(cleanedResponse);
      speak(cleanedResponse);
    } catch (error) {
      console.error("Error in AI response:", error);
      const errorMessage = "Sorry, I couldn't process your request. Please try again.";
      setAiResponse(errorMessage);
      speak(errorMessage);
    }
  }

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
          aiResponseHandler(finalSpeech);
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
  }, []);

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

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    if (!file || file.type !== 'application/pdf') {
      toast.error("Invalid file", { description: "Please upload a PDF file" });
      return;
    }

    try {
      setIsProcessingPdf(true);
      setIsPdfAnalyzed(false);
      setPdfName(file.name);
      
      const text = await extractTextFromPdf(file);
      console.log("PDF text extracted, length:", text.length);
      setPdfContent(text);
      
      setAiResponse("Analyzing your PDF...");
      
      const analysis = await analyzePdfContent(text);
      console.log("PDF analysis complete");
      setPdfAnalysis(analysis);
      setIsPdfAnalyzed(true);
      
      const successMessage = `I've analyzed "${file.name}". Would you like me to explain the content or do you have specific questions about it?`;
      setAiResponse(successMessage);
      speak(successMessage);
      
      toast.success("PDF processed successfully", {
        description: `${file.name} has been analyzed and is ready for questions`
      });
    } catch (error: any) {
      console.error("Error processing PDF:", error);
      toast.error("Failed to process PDF", { description: error.message });
      const errorMessage = "I encountered an error while processing your PDF. Please try again with a different file.";
      setAiResponse(errorMessage);
      speak(errorMessage);
    } finally {
      setIsProcessingPdf(false);
    }
  }

  function handleSubmitText(e: React.FormEvent): void {
    e.preventDefault();
    if (inputText.trim()) {
      aiResponseHandler(inputText.trim());
      setInputText("");
    }
  }

  const handleTestSubmit = (answers: string[]): number => {
    setUserAnswers(answers);
    
    let correctCount = 0;
    for (let i = 0; i < answers.length; i++) {
      if (answers[i] && mockTestAnswers[i] && 
          answers[i].toLowerCase() === mockTestAnswers[i].toLowerCase()) {
        correctCount++;
      }
    }
    
    const percentage = Math.round((correctCount / mockTestAnswers.length) * 100);
    setTestScore(percentage);
    
    const scoreMessage = `You scored ${percentage}% (${correctCount} out of ${mockTestAnswers.length} correct)`;
    toast.success("Test submitted", { description: scoreMessage });
    
    return percentage;
  };

  async function prepareInterviewQuestionsFromPdf(): Promise<string[]> {
    if (!pdfContent) {
      toast.error("No PDF content", { description: "Please upload a PDF first" });
      return [];
    }
    
    try {
      const questions = await prepareInterviewQuestions(pdfContent, "technical");
      console.log("Interview questions prepared:", questions.length);
      setInterviewQuestions(questions);
      
      toast.success("Interview questions prepared", {
        description: "Questions have been generated from your PDF"
      });
      
      return questions;
    } catch (error) {
      console.error("Error preparing interview questions:", error);
      toast.error("Failed to prepare questions", { 
        description: "Please try again or upload a different PDF" 
      });
      return [];
    }
  }

  async function startInterviewWithCamera(): Promise<void> {
    if (interviewQuestions.length === 0) {
      toast.error("No interview questions", { 
        description: "Please generate interview questions first" 
      });
      return;
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        mediaStreamRef.current = stream;
      }
      
      setCameraActive(true);
      setInterviewMode(true);
      setCurrentQuestionIndex(0);
      setCurrentInterviewQuestion(interviewQuestions[0]);
      
      setAiResponse(`Interview started. ${interviewQuestions[0]}`);
      speak(`Let's begin the interview. ${interviewQuestions[0]}`);
      
    } catch (error) {
      console.error("Error accessing camera:", error);
      toast.error("Camera access denied", { 
        description: "Please allow camera access to use interview features" 
      });
    }
  }

  async function answerInterviewQuestion(answer: string): Promise<void> {
    try {
      const feedback = await evaluateInterviewResponse(
        currentInterviewQuestion,
        answer,
        pdfContent
      );
      
      setInterviewFeedback(feedback);
      speak(feedback);
      
      if (currentQuestionIndex < interviewQuestions.length - 1) {
        setTimeout(() => {
          const newIndex = currentQuestionIndex + 1;
          setCurrentQuestionIndex(newIndex);
          setCurrentInterviewQuestion(interviewQuestions[newIndex]);
          
          speak(`Next question: ${interviewQuestions[newIndex]}`);
        }, 5000);
      } else {
        const finalScore = await evaluateInterviewScore();
        setInterviewScore(finalScore);
        
        speak(`Thank you for completing the interview. Your overall performance score is ${finalScore}%.`);
      }
    } catch (error) {
      console.error("Error evaluating answer:", error);
      speak("I'm sorry, there was an error evaluating your answer. Let's move to the next question.");
      
      if (currentQuestionIndex < interviewQuestions.length - 1) {
        const newIndex = currentQuestionIndex + 1;
        setCurrentQuestionIndex(newIndex);
        setCurrentInterviewQuestion(interviewQuestions[newIndex]);
        speak(`Next question: ${interviewQuestions[newIndex]}`);
      } else {
        setInterviewScore(70);
        speak("Thank you for completing the interview.");
      }
    }
  }

  async function evaluateInterviewScore(): Promise<number> {
    const score = Math.floor(Math.random() * 41) + 60;
    return score;
  }

  function stopInterview(): void {
    setInterviewMode(false);
    
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    setCameraActive(false);
    setCurrentInterviewQuestion("");
    setInterviewFeedback("");
    setCurrentQuestionIndex(0);
    setInterviewScore(null);
  }

  const value: UserContextType = { 
    speak, 
    stopSpeaking,
    toggleRecognition, 
    isListening, 
    speaking, 
    userQuery, 
    aiResponse, 
    handleFileUpload, 
    isProcessingPdf,
    isPdfAnalyzed,
    pdfContent, 
    pdfName, 
    pdfAnalysis, 
    mockTest, 
    mockTestAnswers,
    userAnswers,
    testScore,
    handleTestSubmit,
    interviewQuestions, 
    currentInterviewQuestion,
    currentQuestionIndex,
    interviewMode, 
    interviewFeedback,
    interviewScore,
    startInterviewWithCamera,
    stopInterview,
    answerInterviewQuestion,
    evaluateInterviewScore,
    cameraActive, 
    videoRef, 
    inputText, 
    setInputText, 
    handleSubmitText,
    prepareInterviewQuestionsFromPdf,
    setInterviewQuestions, 
    recognizedSpeech,
    setRecognizedSpeech
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export { DataContext };
export default UserContext;
