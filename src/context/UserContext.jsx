
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

const DataContext = createContext();

function UserContext({ children }) {
  // Speech & recognition states
  const [speaking, setSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState(null);
  
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
  const [interviewQuestions, setInterviewQuestions] = useState([]);
  const [currentInterviewQuestion, setCurrentInterviewQuestion] = useState("");
  const [interviewMode, setInterviewMode] = useState(false);
  const [interviewFeedback, setInterviewFeedback] = useState("");
  
  // Camera states
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef(null);
  const mediaStreamRef = useRef(null);

  function cleanText(text) {
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

  function speak(text) {
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
      // Only restart listening if recognition exists
      if (recognition) {
        setIsListening(true);
        recognition.start();
      }
    };

    window.speechSynthesis.speak(text_speak);
  }

  async function aiResponseHandler(prompt) {
    try {
      console.log("User Question:", prompt);
      setUserQuery(prompt);
      setAiResponse("Thinking... 🤔");

      // Check if the question is PDF-related and we have PDF content
      let response;
      if (pdfContent && (
        prompt.toLowerCase().includes("pdf") || 
        prompt.toLowerCase().includes("document") ||
        prompt.toLowerCase().includes("analyze") ||
        prompt.toLowerCase().includes("content") ||
        prompt.toLowerCase().includes("summary")
      )) {
        // Use PDF-specific answering
        response = await answerQuestionFromPdf(prompt, pdfContent);
      } else if (pdfContent && prompt.toLowerCase().includes("test") || prompt.toLowerCase().includes("quiz") || prompt.toLowerCase().includes("exam")) {
        // Generate a mock test
        response = await generateMockTest(pdfContent, "comprehensive", 10);
      } else {
        // Regular query - THIS WAS THE ISSUE - changed from run to runQuery
        response = await runQuery(prompt);
      }
      
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

      recog.onresult = async (event) => {
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

  async function handleFileUpload(event) {
    const file = event.target.files[0];
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
    } catch (error) {
      console.error("Error processing PDF:", error);
      toast.error("Failed to process PDF", { description: error.message });
      setAiResponse("I encountered an error while processing your PDF. Please try again with a different file.");
      speak("I encountered an error while processing your PDF. Please try again with a different file.");
    } finally {
      setIsProcessingPdf(false);
    }
  }

  function handleSubmitText(e) {
    e.preventDefault();
    if (inputText.trim()) {
      aiResponseHandler(inputText.trim());
      setInputText("");
    }
  }

  let value = { 
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
    startInterviewWithCamera: () => {}, // Placeholder for interview functionality
    stopInterview: () => {}, // Placeholder for interview functionality 
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
