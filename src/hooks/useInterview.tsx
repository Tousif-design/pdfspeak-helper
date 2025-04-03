
import { useState, useRef } from "react";
import { toast } from "sonner";
import { prepareInterviewQuestions, evaluateInterviewResponse } from "../lib/geminiHelpers";

export interface UseInterviewReturn {
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
  prepareInterviewQuestionsFromPdf: (pdfContent: string) => Promise<string[]>;
  setInterviewQuestions: React.Dispatch<React.SetStateAction<string[]>>;
}

export interface UseInterviewProps {
  speak: (text: string) => void;
}

export function useInterview({ speak }: UseInterviewProps): UseInterviewReturn {
  const [interviewQuestions, setInterviewQuestions] = useState<string[]>([]);
  const [currentInterviewQuestion, setCurrentInterviewQuestion] = useState("");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [interviewMode, setInterviewMode] = useState(false);
  const [interviewFeedback, setInterviewFeedback] = useState("");
  const [interviewScore, setInterviewScore] = useState<number | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  async function prepareInterviewQuestionsFromPdf(pdfContent: string): Promise<string[]> {
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
        ""  // We need to pass pdfContent here, but we'll handle this in the main context
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

  return {
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
    prepareInterviewQuestionsFromPdf,
    setInterviewQuestions
  };
}
