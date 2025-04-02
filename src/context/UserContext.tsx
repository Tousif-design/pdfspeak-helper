
import React, { createContext, useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { extractTextFromPdf } from "../lib/pdfUtils";
import { 
  analyzePdfContent, 
  answerQuestionFromPdf,
  generateMockTest,
  prepareInterviewQuestions,
  evaluateInterviewResponse,
  runQuery
} from "../lib/geminiHelpers";

// Create context with default values
export const DataContext = createContext({} as UserContextType);

// Define the TypeScript interface for our context
export interface UserContextType {
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
  chatHistory: {role: 'user' | 'assistant', content: string}[];
  setChatHistory: React.Dispatch<React.SetStateAction<{role: 'user' | 'assistant', content: string}[]>>;
}

function UserContext({ children }: { children: React.ReactNode }) {
  // Speech & recognition states
  const [speaking, setSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);
  const [recognizedSpeech, setRecognizedSpeech] = useState("");
  
  // User interaction states
  const [userQuery, setUserQuery] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [inputText, setInputText] = useState("");
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'assistant', content: string}[]>([]);
  
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
  const [interviewMode, setInterviewMode] = useState(false);
  const [interviewFeedback, setInterviewFeedback] = useState("");
  const [interviewScore, setInterviewScore] = useState<number | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  
  // Camera states
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  
  // Optional delay for speak function
  const speakDelay = 1000;

  // Function to manually stop speech
  function stopSpeaking() {
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

  function speak(text: string) {
    if (!text) return;

    // Stop any ongoing speech first
    stopSpeaking();

    let cleanedText = cleanText(text);
    let text_speak = new SpeechSynthesisUtterance(cleanedText);
    text_speak.volume = 1;
    text_speak.rate = 1.1;
    text_speak.pitch = 1.2;
    text_speak.lang = "en-GB";

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

  async function aiResponseHandler(prompt: string) {
    try {
      console.log("User Question:", prompt);
      setUserQuery(prompt);
      setAiResponse("Thinking... 🤔");

      // Add user message to chat history
      setChatHistory(prev => [...prev, { role: 'user', content: prompt }]);

      // Check for stop commands
      if (prompt.toLowerCase().includes("stop") || 
          prompt.toLowerCase().includes("cancel") ||
          prompt.toLowerCase().includes("quiet")) {
        stopSpeaking();
        const stopResponse = "I've stopped speaking as requested.";
        setAiResponse(stopResponse);
        setChatHistory(prev => [...prev, { role: 'assistant', content: stopResponse }]);
        return;
      }

      // Extract PDF-related commands
      const isPdfSummaryRequest = prompt.toLowerCase().includes("summarize") && 
                                 (prompt.toLowerCase().includes("pdf") || 
                                  prompt.toLowerCase().includes("document") ||
                                  prompt.toLowerCase().includes("content"));

      // Check if we have a PDF but user is asking for summary
      if (isPdfSummaryRequest && !pdfContent) {
        const noPdfMessage = "Please provide me with a PDF! I need the content of a PDF to summarize it for you.";
        setAiResponse(noPdfMessage);
        setChatHistory(prev => [...prev, { role: 'assistant', content: noPdfMessage }]);
        speak(noPdfMessage);
        return;
      }

      // Check if the question is PDF-related and we have PDF content
      let response;
      if (pdfContent && (
        prompt.toLowerCase().includes("pdf") || 
        prompt.toLowerCase().includes("document") ||
        prompt.toLowerCase().includes("analyze") ||
        prompt.toLowerCase().includes("content") ||
        prompt.toLowerCase().includes("summary") ||
        prompt.toLowerCase().includes("about the") ||
        prompt.toLowerCase().includes("what does the") ||
        prompt.toLowerCase().includes("tell me about") ||
        isPdfSummaryRequest
      )) {
        // Use PDF-specific answering
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
          // Answer specific question
          response = await answerQuestionFromPdf(prompt, pdfContent);
        }
      } else if (pdfContent && (
        prompt.toLowerCase().includes("test") || 
        prompt.toLowerCase().includes("quiz") || 
        prompt.toLowerCase().includes("exam")
      )) {
        // Generate a mock test
        console.log("Generating mock test");
        response = await generateMockTest(pdfContent, "comprehensive", 10);
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
      
      const cleanedResponse = cleanText(response || "Sorry, I couldn't process your request.");

      console.log("AI Response:", cleanedResponse.substring(0, 100) + "...");
      setAiResponse(cleanedResponse);
      
      // Add AI response to chat history
      setChatHistory(prev => [...prev, { role: 'assistant', content: cleanedResponse }]);
      
      speak(cleanedResponse);
    } catch (error) {
      console.error("Error in AI response:", error);
      const errorMessage = "Sorry, I couldn't process your request. Please try again.";
      setAiResponse(errorMessage);
      setChatHistory(prev => [...prev, { role: 'assistant', content: errorMessage }]);
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
        setRecognizedSpeech(speechText);
        await aiResponseHandler(speechText);
      };

      recog.onend = () => {
        console.log("Speech recognition stopped...");
        setIsListening(false);
      };

      setRecognition(recog);
    } else {
      console.warn("Speech Recognition is not supported in this browser.");
    }
  }, []);

  function toggleRecognition() {
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

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
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
      setChatHistory(prev => [...prev, { role: 'assistant', content: "Analyzing your PDF..." }]);
      
      // Analyze the PDF content
      const analysis = await analyzePdfContent(text);
      console.log("PDF analysis complete");
      setPdfAnalysis(analysis);
      setIsPdfAnalyzed(true);
      
      // Provide feedback to user
      const successMessage = `I've analyzed "${file.name}". Would you like me to explain the content or do you have specific questions about it?`;
      setAiResponse(successMessage);
      setChatHistory(prev => [...prev, { role: 'assistant', content: successMessage }]);
      speak(successMessage);
      
      toast.success("PDF processed successfully", {
        description: `${file.name} has been analyzed and is ready for questions`
      });
    } catch (error: any) {
      console.error("Error processing PDF:", error);
      toast.error("Failed to process PDF", { description: error.message });
      const errorMessage = "I encountered an error while processing your PDF. Please try again with a different file.";
      setAiResponse(errorMessage);
      setChatHistory(prev => [...prev, { role: 'assistant', content: errorMessage }]);
      speak(errorMessage);
    } finally {
      setIsProcessingPdf(false);
    }
  }

  function handleSubmitText(e: React.FormEvent) {
    e.preventDefault();
    if (inputText.trim()) {
      aiResponseHandler(inputText.trim());
      setInputText("");
    }
  }

  // Handle test submission and scoring
  const handleTestSubmit = (answers: string[]) => {
    setUserAnswers(answers);
    
    // Calculate score
    let correctCount = 0;
    const mockTestAnswersLength = mockTestAnswers?.length || 0;
    
    for (let i = 0; i < answers.length; i++) {
      if (i < mockTestAnswersLength && answers[i] && mockTestAnswers[i] && 
          answers[i].toLowerCase() === mockTestAnswers[i].toLowerCase()) {
        correctCount++;
      }
    }
    
    const percentage = mockTestAnswersLength > 0 ? 
      Math.round((correctCount / mockTestAnswersLength) * 100) : 0;
    
    setTestScore(percentage);
    
    const scoreMessage = `You scored ${percentage}% (${correctCount} out of ${mockTestAnswersLength} correct)`;
    toast.success("Test submitted", { description: scoreMessage });
    
    return percentage;
  };

  // Interview functions
  async function startInterviewWithCamera() {
    if (!interviewQuestions || interviewQuestions.length === 0) {
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

  async function answerInterviewQuestion(answer: string) {
    if (!currentInterviewQuestion || !pdfContent) {
      toast.error("Interview setup incomplete");
      return;
    }
    
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
        }, speakDelay);
        
        return newIndex;
      });
    } else {
      // End of interview
      const finalScore = await evaluateInterviewScore();
      setInterviewScore(finalScore);
      
      speak(`Thank you for completing the interview. Your overall performance score is ${finalScore}%.`);
    }
  }

  async function evaluateInterviewScore() {
    // Calculate overall score based on all feedback
    const score = Math.floor(Math.random() * 41) + 60; // 60-100% for demo
    return score;
  }

  function stopInterview() {
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

  // Function to prepare interview questions from PDF
  async function prepareInterviewQuestionsFromPdf(): Promise<string[]> {
    if (!pdfContent) {
      toast.error("No PDF content", { description: "Please upload a PDF first" });
      return [];
    }

    try {
      const questions = await prepareInterviewQuestions(pdfContent, "technical");
      setInterviewQuestions(questions);
      return questions;
    } catch (error) {
      console.error("Error preparing interview questions:", error);
      toast.error("Failed to prepare interview questions");
      return [];
    }
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
    interviewMode, 
    interviewFeedback,
    interviewScore,
    currentQuestionIndex,
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
    setRecognizedSpeech,
    chatHistory,
    setChatHistory
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export default UserContext;
