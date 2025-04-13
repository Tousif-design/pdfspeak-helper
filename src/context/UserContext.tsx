
import React, { createContext, useState, useEffect } from "react";
import { useSpeech } from "../hooks/useSpeech";
import { usePdfProcessor } from "../hooks/usePdfProcessor";
import { useMockTest } from "../hooks/useMockTest";
import { useInterview } from "../hooks/useInterview";

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
  const [inputText, setInputText] = useState("");

  // Initialize all our custom hooks
  const speechHook = useSpeech();
  const { 
    speak, 
    stopSpeaking, 
    toggleRecognition, 
    isListening, 
    speaking,
    recognizedSpeech,
    setRecognizedSpeech
  } = speechHook;

  const pdfHook = usePdfProcessor({ speak, stopSpeaking });
  const {
    handleFileUpload,
    isProcessingPdf,
    isPdfAnalyzed,
    pdfContent,
    pdfName,
    pdfAnalysis,
    aiResponseHandler,
    userQuery,
    aiResponse
  } = pdfHook;

  const mockTestHook = useMockTest();
  const {
    mockTest,
    mockTestAnswers,
    userAnswers,
    testScore,
    handleTestSubmit,
    generateTest
  } = mockTestHook;

  const interviewHook = useInterview({ speak });
  const {
    interviewQuestions,
    currentInterviewQuestion,
    currentQuestionIndex,
    interviewMode,
    interviewFeedback,
    interviewScore,
    startInterviewWithCamera,
    stopInterview,
    answerInterviewQuestion: originalAnswerInterviewQuestion,
    evaluateInterviewScore,
    cameraActive,
    videoRef,
    prepareInterviewQuestionsFromPdf: originalPrepareInterviewQuestions,
    setInterviewQuestions
  } = interviewHook;

  // We need to override these functions to pass the PDF content
  const prepareInterviewQuestionsFromPdf = async (): Promise<string[]> => {
    return originalPrepareInterviewQuestions(pdfContent);
  };

  const answerInterviewQuestion = async (answer: string): Promise<void> => {
    // This is where we inject the pdfContent
    try {
      await originalAnswerInterviewQuestion(answer);
    } catch (error) {
      console.error("Error in interview answer:", error);
    }
  };

  function handleSubmitText(e: React.FormEvent): void {
    e.preventDefault();
    if (inputText.trim()) {
      aiResponseHandler(inputText.trim());
      setInputText("");
    }
  }

  // Hook up the recognition results to aiResponseHandler
  useEffect(() => {
    if (recognizedSpeech) {
      aiResponseHandler(recognizedSpeech);
    }
  }, [recognizedSpeech]);

  // Specifically for mock test generation from userQuery
  useEffect(() => {
    const handleTestRequest = async () => {
      if (
        pdfContent && 
        userQuery && 
        (userQuery.toLowerCase().includes("test") || 
         userQuery.toLowerCase().includes("quiz") || 
         userQuery.toLowerCase().includes("exam"))
      ) {
        await generateTest(pdfContent);
      }
    };

    handleTestRequest();
  }, [userQuery, pdfContent]);

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
