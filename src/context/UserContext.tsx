
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

interface UserContextType {
  speak: (text: string) => void;
  toggleRecognition: () => void;
  isListening: boolean;
  speaking: boolean;
  userQuery: string;
  aiResponse: string;
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  isProcessingPdf: boolean;
  pdfContent: string;
  pdfName: string;
  pdfAnalysis: string;
  mockTest: string;
  interviewQuestions: string[];
  currentInterviewQuestion: string;
  interviewMode: boolean;
  interviewFeedback: string;
  startInterviewWithCamera: () => Promise<void>;
  stopInterview: () => void;
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
  const [recognition, setRecognition] = useState<any>(null);
  
  // User interaction states
  const [userQuery, setUserQuery] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [inputText, setInputText] = useState("");
  
  // PDF related states
  const [pdfContent, setPdfContent] = useState("");
  const [pdfName, setPdfName] = useState("");
  const [pdfAnalysis, setPdfAnalysis] = useState("");
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  
  // Test & Interview states
  const [mockTest, setMockTest] = useState("");
  const [interviewQuestions, setInterviewQuestions] = useState<string[]>([]);
  const [currentInterviewQuestion, setCurrentInterviewQuestion] = useState("");
  const [interviewMode, setInterviewMode] = useState(false);
  const [interviewFeedback, setInterviewFeedback] = useState("");
  
  // Camera states
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Speech voice settings
  const [voiceSettings] = useState({
    voice: null,
    volume: 1,
    rate: 1.1,
    pitch: 1.2,
    lang: "en-GB"
  });

  // Initialize voice settings
  useEffect(() => {
    const populateVoiceList = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        // Choose a premium female voice if available
        const preferredVoices = [
          voices.find(voice => voice.name.includes("Samantha")),
          voices.find(voice => voice.name.includes("Ava")),
          voices.find(voice => voice.name.includes("Female")),
          voices.find(voice => /en-US|en-GB/.test(voice.lang) && voice.name.includes("Google"))
        ];
        
        const selectedVoice = preferredVoices.find(voice => voice !== undefined) || voices[0];
      }
    };
    
    populateVoiceList();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = populateVoiceList;
    }
  }, []);

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

    let cleanedText = cleanText(text);
    let text_speak = new SpeechSynthesisUtterance(cleanedText);
    text_speak.volume = 1;
    text_speak.rate = 1.1;
    text_speak.pitch = 1.2;
    text_speak.lang = "en-GB";

    text_speak.onstart = () => {
      setSpeaking(true);
      setIsListening(false);
    };

    text_speak.onend = () => {
      setSpeaking(false);
      setIsListening(true);
      recognition?.start();
    };

    window.speechSynthesis.speak(text_speak);
  }

  async function aiResponseHandler(prompt: string): Promise<void> {
    try {
      console.log("User Question:", prompt);
      setUserQuery(prompt);
      setAiResponse("Thinking... 🤔");

      const response = await runQuery(prompt);
      const cleanedResponse = cleanText(response);

      console.log("AI Response:", cleanedResponse);
      setAiResponse(cleanedResponse);
      speak(cleanedResponse);
    } catch (error) {
      console.error("Error in AI response:", error);
      setAiResponse("Sorry, I couldn't understand that. Try again.");
      speak("Sorry, I couldn't understand that. Try again.");
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

      recog.onresult = async (event: any) => {
        let speechText = event.results[event.results.length - 1][0].transcript;
        console.log("Recognized Speech:", speechText);
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
      setPdfName(file.name);
      
      // Extract text from PDF
      const text = await extractTextFromPdf(file);
      setPdfContent(text);
      
      // Analyze the PDF content
      const analysis = await analyzePdfContent(text);
      setPdfAnalysis(analysis);
      
      // Provide feedback to user
      setAiResponse(`I've analyzed "${file.name}". Would you like me to explain the content or do you have specific questions about it?`);
      speak(`I've analyzed the PDF titled ${file.name}. Would you like me to explain the content or do you have specific questions about it?`);
      
      toast.success("PDF processed successfully", {
        description: `${file.name} has been analyzed and is ready for questions`
      });
    } catch (error: any) {
      console.error("Error processing PDF:", error);
      toast.error("Failed to process PDF", { description: error.message });
      setAiResponse("I encountered an error while processing your PDF. Please try again with a different file.");
      speak("I encountered an error while processing your PDF. Please try again with a different file.");
    } finally {
      setIsProcessingPdf(false);
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
  }

  function handleSubmitText(e: React.FormEvent): void {
    e.preventDefault();
    if (inputText.trim()) {
      aiResponseHandler(inputText.trim());
      setInputText("");
    }
  }

  const value: UserContextType = { 
    speak, 
    toggleRecognition, 
    isListening, 
    speaking, 
    userQuery, 
    aiResponse, 
    handleFileUpload, 
    isProcessingPdf, 
    pdfContent, 
    pdfName, 
    pdfAnalysis, 
    mockTest, 
    interviewQuestions, 
    currentInterviewQuestion, 
    interviewMode, 
    interviewFeedback, 
    startInterviewWithCamera, 
    stopInterview, 
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
