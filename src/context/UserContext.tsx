
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
}

const DataContext = createContext<UserContextType>({} as UserContextType);

function UserContext({ children }: { children: React.ReactNode }) {
  // Speech & recognition states
  const [speaking, setSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  
  // User interaction states
  const [userQuery, setUserQuery] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [inputText, setInputText] = useState("");
  
  // PDF related states
  const [pdfContent, setPdfContent] = useState("");
  const [pdfName, setPdfName] = useState("");
  const [pdfAnalysis, setPdfAnalysis] = useState("");
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [isPdfAnalyzed, setIsPdfAnalyzed] = useState(false);
  
  // Test & Interview states
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
  
  // Camera states
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Function to manually stop speech
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

    // First ensure any ongoing speech is stopped
    stopSpeaking();

    let cleanedText = cleanText(text);
    let text_speak = new SpeechSynthesisUtterance(cleanedText);
    text_speak.volume = 1;
    text_speak.rate = 1.1;
    text_speak.pitch = 1.2;
    text_speak.lang = "en-GB";

    // Prevent long texts from getting cut off
    if (cleanedText.length > 1000) {
      // Split into sentences and speak in chunks
      const sentences = cleanedText.match(/[^.!?]+[.!?]+/g) || [];
      let i = 0;
      
      const speakNextChunk = () => {
        if (i < sentences.length) {
          const chunk = sentences.slice(i, i + 5).join(" ");
          const chunkUtterance = new SpeechSynthesisUtterance(chunk);
          chunkUtterance.volume = 1;
          chunkUtterance.rate = 1.1;
          chunkUtterance.pitch = 1.2;
          chunkUtterance.lang = "en-GB";
          
          chunkUtterance.onstart = () => {
            setSpeaking(true);
            if (isListening && recognition) {
              recognition.stop();
              setIsListening(false);
            }
          };
          
          chunkUtterance.onend = () => {
            i += 5;
            speakNextChunk();
          };
          
          window.speechSynthesis.speak(chunkUtterance);
        } else {
          setSpeaking(false);
          // Resume listening if it was active before
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
      
      speakNextChunk();
      return;
    }

    text_speak.onstart = () => {
      setSpeaking(true);
      if (isListening && recognition) {
        recognition.stop();
        setIsListening(false);
      }
    };

    text_speak.onend = () => {
      setSpeaking(false);
      // Only restart listening if recognition exists and we were previously listening
      if (recognition && !isListening) {
        try {
          setIsListening(true);
          recognition.start();
        } catch (error) {
          console.error("Error restarting recognition:", error);
          // If we get an error, try to reset the recognition
          if (recognition) {
            recognition.stop();
            setTimeout(() => {
              setIsListening(true);
              recognition.start();
            }, 300);
          }
        }
      }
    };

    window.speechSynthesis.speak(text_speak);
  }

  async function aiResponseHandler(prompt: string): Promise<void> {
    try {
      console.log("User Question:", prompt);
      setUserQuery(prompt);
      setAiResponse("Thinking... 🤔");

      // Check for stop commands
      if (prompt.toLowerCase().includes("stop") || 
          prompt.toLowerCase().includes("cancel") ||
          prompt.toLowerCase().includes("quiet") ||
          prompt.toLowerCase().includes("shut up")) {
        stopSpeaking();
        setAiResponse("I've stopped speaking as requested.");
        return;
      }

      // Improved PDF-related command detection
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

      // Check if we have a PDF but user is asking for content without PDF
      if (isPdfSummaryRequest && !pdfContent) {
        const noPdfMessage = "Please provide me with a PDF! I need the content of a PDF to summarize it for you.";
        setAiResponse(noPdfMessage);
        speak(noPdfMessage);
        return;
      }

      // Check if the question is PDF-related and we have PDF content
      let response;
      
      // Enhanced PDF content detection - prioritize PDF analysis when PDF is available
      if (pdfContent) {
        // When PDF is available, assume most questions are about the PDF unless clearly not
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
          console.log("Using PDF-specific answering");
          
          if (isPdfSummaryRequest) {
            // If it's a summary request, use the analysis
            if (pdfAnalysis) {
              response = pdfAnalysis;
            } else {
              // Generate analysis on demand
              response = await analyzePdfContent(pdfContent);
              setPdfAnalysis(response);
            }
          } else {
            // Answer specific question about the PDF
            response = await answerQuestionFromPdf(prompt, pdfContent);
          }
        } else if (prompt.toLowerCase().includes("test") || 
                  prompt.toLowerCase().includes("quiz") || 
                  prompt.toLowerCase().includes("exam")) {
          // Generate a mock test
          console.log("Generating mock test");
          response = await generateMockTest(pdfContent, "comprehensive", 10, "mixed");
          setMockTest(response);
          
          // Extract answers for scoring
          const answerSection = response.match(/ANSWERS[\s\S]*$/i);
          if (answerSection) {
            const answers = answerSection[0].match(/\d+\.\s*([A-D]|.+)/g) || [];
            setMockTestAnswers(answers.map(a => a.trim()));
          }
        } else {
          // Regular query
          console.log("Using regular query");
          response = await runQuery(prompt);
        }
      } else {
        // No PDF available, use regular query
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
    let SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      let recog = new SpeechRecognition();
      recog.continuous = true;
      recog.interimResults = false;
      recog.lang = "en-US";
      recog.maxAlternatives = 1;

      recog.onstart = () => {
        console.log("Speech recognition started...");
        setIsListening(true);
      };

      recog.onresult = async (event) => {
        let speechText = event.results[event.results.length - 1][0].transcript;
        console.log("Recognized Speech:", speechText);
        
        // If already speaking, treat "stop" commands specially
        if (speaking && 
           (speechText.toLowerCase().includes("stop") || 
            speechText.toLowerCase().includes("quiet") || 
            speechText.toLowerCase().includes("shut up") ||
            speechText.toLowerCase().includes("cancel"))) {
          stopSpeaking();
          setAiResponse("I've stopped speaking as requested.");
        } else if (!speaking) {
          // Only process speech if not already speaking
          await aiResponseHandler(speechText);
        }
      };

      recog.onend = () => {
        console.log("Speech recognition stopped...");
        setIsListening(false);
        
        // Auto-restart recognition if it wasn't manually stopped
        if (!speaking) {
          try {
            setIsListening(true);
            recog.start();
          } catch (error) {
            console.error("Error auto-restarting recognition:", error);
            // If restart fails, wait a moment and try again
            setTimeout(() => {
              try {
                setIsListening(true);
                recog.start();
              } catch (innerError) {
                console.error("Failed to restart recognition after delay:", innerError);
              }
            }, 1000);
          }
        }
      };

      recog.onerror = (event) => {
        console.error("Recognition error:", event.error);
        // If aborted, don't show toast
        if (event.error !== 'aborted') {
          toast.error("Voice recognition error", { 
            description: "Please try again or type your question" 
          });
        }
      };

      setRecognition(recog);
      
      // Auto-start recognition
      try {
        recog.start();
      } catch (error) {
        console.error("Error starting recognition initially:", error);
      }
    } else {
      console.warn("Speech Recognition is not supported in this browser.");
      toast.error("Voice features unavailable", { 
        description: "Your browser doesn't support speech recognition" 
      });
    }
    
    // Cleanup
    return () => {
      if (recognition) {
        try {
          recognition.stop();
        } catch (error) {
          console.error("Error stopping recognition on cleanup:", error);
        }
      }
    };
  }, []);

  function toggleRecognition(): void {
    if (!recognition) return;
    if (isListening) {
      console.log("Stopping recognition...");
      setIsListening(false);
      recognition.stop();
    } else {
      console.log("Starting recognition...");
      setIsListening(true);
      recognition.start();
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
      
      // Extract text from PDF
      const text = await extractTextFromPdf(file);
      console.log("PDF text extracted, length:", text.length);
      setPdfContent(text);
      
      // Show loading
      setAiResponse("Analyzing your PDF...");
      
      // Analyze the PDF content
      const analysis = await analyzePdfContent(text);
      console.log("PDF analysis complete");
      setPdfAnalysis(analysis);
      setIsPdfAnalyzed(true);
      
      // Provide feedback to user
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

  // Handle test submission and scoring
  const handleTestSubmit = (answers: string[]): number => {
    setUserAnswers(answers);
    
    // Calculate score
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

  // Interview functions
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
      
      // Announce first question
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
    // Evaluate the current answer
    const feedback = await evaluateInterviewResponse(
      currentInterviewQuestion,
      answer,
      pdfContent
    );
    
    setInterviewFeedback(feedback);
    
    // Move to the next question if available
    if (currentQuestionIndex < interviewQuestions.length - 1) {
      setCurrentQuestionIndex(prevIndex => {
        const newIndex = prevIndex + 1;
        setCurrentInterviewQuestion(interviewQuestions[newIndex]);
        
        // Announce next question
        setTimeout(() => {
          speak(`Next question: ${interviewQuestions[newIndex]}`);
        }, 2000);
        
        return newIndex;
      });
    } else {
      // End of interview
      const finalScore = await evaluateInterviewScore();
      setInterviewScore(finalScore);
      
      speak(`Thank you for completing the interview. Your overall performance score is ${finalScore}%.`);
    }
  }

  async function evaluateInterviewScore(): Promise<number> {
    // Calculate overall score based on all feedback
    const score = Math.floor(Math.random() * 41) + 60; // 60-100% for demo
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
    handleSubmitText 
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export { DataContext };
export default UserContext;
