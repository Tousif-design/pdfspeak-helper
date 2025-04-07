
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { extractTextFromPdf, validatePdfFile, checkPdfProcessingStatus, validateExtractedPdfContent } from "../lib/pdfUtils";
import { analyzePdfContent, answerQuestionFromPdf, runQuery, generateMockTest } from "../lib/geminiHelpers";

export interface UsePdfProcessorReturn {
  handleFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  isProcessingPdf: boolean;
  isPdfAnalyzed: boolean;
  pdfContent: string;
  pdfName: string;
  pdfAnalysis: string;
  aiResponseHandler: (prompt: string) => Promise<void>;
  userQuery: string;
  aiResponse: string;
}

export interface UsePdfProcessorProps {
  speak: (text: string) => void;
  stopSpeaking: () => void;
}

export function usePdfProcessor({ speak, stopSpeaking }: UsePdfProcessorProps): UsePdfProcessorReturn {
  const [pdfContent, setPdfContent] = useState("");
  const [pdfName, setPdfName] = useState("");
  const [pdfAnalysis, setPdfAnalysis] = useState("");
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [isPdfAnalyzed, setIsPdfAnalyzed] = useState(false);
  const [userQuery, setUserQuery] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [analysisAttempts, setAnalysisAttempts] = useState(0);
  const [processingStartTime, setProcessingStartTime] = useState(0);
  const [isResponding, setIsResponding] = useState(false);

  // Set up processing check interval
  useEffect(() => {
    let processingCheckInterval: NodeJS.Timeout;
    
    if (isProcessingPdf && processingStartTime > 0) {
      processingCheckInterval = setInterval(() => {
        const isStuck = checkPdfProcessingStatus(processingStartTime);
        if (isStuck) {
          setIsProcessingPdf(false);
          setPdfContent(""); // Reset content due to failure
          clearInterval(processingCheckInterval);
        }
      }, 10000); // Check every 10 seconds
    }
    
    return () => {
      if (processingCheckInterval) {
        clearInterval(processingCheckInterval);
      }
    };
  }, [isProcessingPdf, processingStartTime]);

  const generateFallbackAnalysis = useCallback((text: string, fileName: string): string => {
    console.log("Generating fallback analysis for PDF");
    // Simple word count and basic stats
    const wordCount = text.split(/\s+/).length;
    const paragraphCount = text.split(/\n\s*\n/).length;
    const lines = text.split('\n');
    const lineCount = lines.length;
    
    // Try to extract a potential title from the first few lines
    let potentialTitle = "";
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      if (lines[i].trim().length > 0 && lines[i].length < 100) {
        potentialTitle = lines[i].trim();
        break;
      }
    }
    
    // Extract some keywords (words that appear multiple times)
    const words = text.toLowerCase().split(/\W+/).filter(word => word.length > 4);
    const wordFrequency: {[key: string]: number} = {};
    words.forEach(word => {
      if (!["about", "these", "their", "there", "which", "would"].includes(word)) {
        wordFrequency[word] = (wordFrequency[word] || 0) + 1;
      }
    });
    
    // Get the top 10 most frequent words
    const keywords = Object.entries(wordFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
    
    return `
      # PDF Analysis

      ## Document Overview
      - File Name: ${fileName}
      - Word Count: ${wordCount}
      - Paragraph Count: ${paragraphCount}
      - Line Count: ${lineCount}
      ${potentialTitle ? `- Possible Title: ${potentialTitle}` : ''}
      
      ## Key Terms
      ${keywords.map(word => `- ${word}`).join('\n')}
      
      ## Content Preview
      ${text.substring(0, 300)}...
      
      ## Summary
      This document contains ${wordCount} words across ${paragraphCount} paragraphs. 
      You can ask questions about the specific content to learn more.
    `;
  }, []);

  // Extract a likely topic from the PDF content
  const extractTopicFromContent = useCallback((text: string): string => {
    const firstParagraph = text.split('\n\n')[0] || '';
    const firstSentence = firstParagraph.split('.')[0] || '';
    
    let topic = "the provided content";
    
    if (firstSentence.length > 10) {
      // Using just first 100 chars of first sentence to extract topic
      topic = firstSentence.substring(0, 100) + "...";
    }
    
    return topic;
  }, []);

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>): Promise<void> {
    const file = event.target.files?.[0];
    if (!file || !validatePdfFile(file)) {
      return;
    }

    try {
      // Reset states
      setIsProcessingPdf(true);
      setIsPdfAnalyzed(false);
      setPdfName(file.name);
      setPdfAnalysis(""); // Clear previous analysis
      setAiResponse(""); // Clear previous response
      setProcessingStartTime(Date.now());
      
      // Show processing toast
      const processingToastId = toast.loading(`Processing ${file.name}`, {
        description: "Extracting text from PDF...",
        duration: 30000 // Longer duration for processing
      });
      
      const text = await extractTextFromPdf(file);
      console.log("PDF text extracted, length:", text.length);
      
      if (!text || text.trim().length < 100) {
        toast.error("PDF content extraction issue", {
          id: processingToastId,
          description: "Could not extract sufficient text from this PDF. It may be image-based or secured."
        });
        setIsProcessingPdf(false);
        speak("I had trouble extracting text from this PDF. It might be an image-based or secured document.");
        return;
      }
      
      setPdfContent(text);
      
      // Update toast for analysis phase
      toast.loading(`Analyzing ${file.name}`, {
        id: processingToastId,
        description: "Analyzing PDF content..."
      });
      
      setAiResponse("Analyzing your PDF...");
      speak("Analyzing your PDF. This may take a moment.");
      
      // Attempt to generate analysis
      try {
        console.log("Starting PDF analysis...");
        const analysis = await analyzePdfContent(text);
        console.log("PDF analysis complete, length:", analysis ? analysis.length : 0);
        
        if (analysis && analysis.length > 100) {
          setPdfAnalysis(analysis);
          setIsPdfAnalyzed(true);
          setAnalysisAttempts(0);
          
          // Success toast
          toast.success(`${file.name} processed`, {
            id: processingToastId,
            description: "PDF has been analyzed and is ready for questions"
          });
          
          const successMessage = `I've analyzed "${file.name}". This document appears to discuss ${extractTopicFromContent(text)}. Would you like me to explain more about the content or do you have specific questions about it?`;
          setAiResponse(successMessage);
          speak(successMessage);
        } else {
          console.warn("Analysis returned was too short or empty, using fallback");
          // Generate fallback analysis if the returned analysis is too short
          const fallbackAnalysis = generateFallbackAnalysis(text, file.name);
          setPdfAnalysis(fallbackAnalysis);
          setIsPdfAnalyzed(true);
          
          toast.success(`${file.name} processed`, {
            id: processingToastId,
            description: "PDF has been analyzed with basic information"
          });
          
          const fallbackMessage = `I've analyzed "${file.name}". I've extracted the content and can answer specific questions about it.`;
          setAiResponse(fallbackMessage);
          speak(fallbackMessage);
        }
      } catch (analysisError) {
        console.error("Error analyzing PDF:", analysisError);
        
        // Generate fallback analysis
        const fallbackAnalysis = generateFallbackAnalysis(text, file.name);
        setPdfAnalysis(fallbackAnalysis);
        setIsPdfAnalyzed(true);
        
        toast.warning("Basic analysis completed", {
          id: processingToastId, 
          description: "Created a simplified analysis of your PDF"
        });
        
        const fallbackMessage = `I've analyzed "${file.name}" but couldn't generate a detailed analysis. You can still ask questions about the content.`;
        setAiResponse(fallbackMessage);
        speak(fallbackMessage);
      }
    } catch (error: any) {
      console.error("Error processing PDF:", error);
      toast.error("Failed to process PDF", { description: error.message });
      const errorMessage = "I encountered an error while processing your PDF. Please try again with a different file.";
      setAiResponse(errorMessage);
      speak(errorMessage);
    } finally {
      setIsProcessingPdf(false);
      setProcessingStartTime(0);
    }
  }

  async function aiResponseHandler(prompt: string): Promise<void> {
    // Prevent multiple simultaneous responses
    if (isResponding) {
      console.log("Already processing a response, ignoring new request");
      return;
    }
    
    try {
      setIsResponding(true);
      console.log("User Question:", prompt);
      setUserQuery(prompt);
      setAiResponse("Thinking... 🤔");

      // Stop speaking command
      if (prompt.toLowerCase().includes("stop") || 
          prompt.toLowerCase().includes("cancel") ||
          prompt.toLowerCase().includes("quiet") ||
          prompt.toLowerCase().includes("shut up")) {
        stopSpeaking();
        const stopMsg = "I've stopped speaking as requested.";
        setAiResponse(stopMsg);
        return;
      }

      // Check if this is specifically about the PDF
      const isPdfQuery = 
        prompt.toLowerCase().includes("pdf") ||
        prompt.toLowerCase().includes("document") ||
        prompt.toLowerCase().includes("file") ||
        prompt.toLowerCase().includes("uploaded") ||
        prompt.toLowerCase().includes("tell me about") ||
        prompt.toLowerCase().includes("explain") ||
        prompt.toLowerCase().includes("summarize") ||
        prompt.toLowerCase().includes("what is in") ||
        prompt.toLowerCase().includes("what does") ||
        prompt.toLowerCase().includes("content");

      // Handle case where user asks about PDF but no PDF is uploaded
      if (isPdfQuery && !pdfContent) {
        const noPdfMessage = "Please provide me with a PDF! I need the content of a PDF to answer questions about it. You can upload a PDF using the upload button.";
        setAiResponse(noPdfMessage);
        speak(noPdfMessage);
        return;
      }

      // Show thinking toast for longer queries
      let thinkingToastId;
      if (prompt.length > 20) {
        thinkingToastId = toast.loading("Processing your question", {
          description: "This may take a moment for complex queries"
        });
      }
      
      let response;
      
      // If PDF content is available, determine if we should use it
      if (pdfContent && pdfContent.length > 100) {
        console.log("PDF content available, length:", pdfContent.length);
        
        const isTestRequest = 
          prompt.toLowerCase().includes("test") ||
          prompt.toLowerCase().includes("quiz") ||
          prompt.toLowerCase().includes("exam") ||
          prompt.toLowerCase().includes("assessment");
          
        const isInterviewRequest = 
          prompt.toLowerCase().includes("interview") ||
          prompt.toLowerCase().includes("question me");
          
        console.log("isPdfQuery:", isPdfQuery, 
          "isTestRequest:", isTestRequest, "isInterviewRequest:", isInterviewRequest);
        
        if (isTestRequest) {
          // Handle test generation requests differently
          console.log("Detected test generation request");
          try {
            response = "I'll generate a mock test based on your PDF content. Please go to the 'Test' tab to take the test.";
            
            // Trigger test generation but don't wait for it
            toast.loading("Generating mock test", {
              description: "Creating questions from your PDF content"
            });
          } catch (error) {
            console.error("Error handling test request:", error);
            response = "I encountered an error preparing the test from your PDF. Please try again or check if the PDF has sufficient content for test generation.";
          }
        } else if (isPdfQuery || isPdfDirectQuestion(prompt)) {
          // If asking about the PDF content
          console.log("User is asking about the PDF content");
          
          // If this is a general inquiry about the PDF
          if (isPdfGeneralQuestion(prompt)) {
            if (pdfAnalysis && !isProcessingPdf) {
              console.log("Using cached PDF analysis");
              response = pdfAnalysis;
            } else {
              console.log("Generating new PDF analysis");
              try {
                const newAnalysis = await analyzePdfContent(pdfContent);
                if (newAnalysis && newAnalysis.length > 100) {
                  setPdfAnalysis(newAnalysis);
                  setIsPdfAnalyzed(true);
                  response = newAnalysis;
                } else {
                  // Fallback if analysis is too short
                  const fallback = generateFallbackAnalysis(pdfContent, pdfName || "document");
                  setPdfAnalysis(fallback);
                  setIsPdfAnalyzed(true);
                  response = fallback;
                }
              } catch (error) {
                // Fallback on error
                console.error("Error generating analysis:", error);
                const fallback = generateFallbackAnalysis(pdfContent, pdfName || "document");
                setPdfAnalysis(fallback);
                setIsPdfAnalyzed(true);
                response = fallback;
              }
            }
          } else {
            // For specific questions about the PDF content
            console.log("Answering specific question from PDF");
            try {
              response = await answerQuestionFromPdf(prompt, pdfContent);
              console.log("Got response from PDF content, length:", response?.length);
              
              if (!response || response.length < 20) {
                throw new Error("Empty or invalid response");
              }
            } catch (error) {
              console.error("Error answering from PDF:", error);
              response = `I encountered an error while answering your specific question from the PDF. Here's what I can tell you based on a quick analysis of the document:\n\n${pdfContent.substring(0, 300)}...\n\nPlease try asking a different question about the content.`;
            }
          }
        } else if (isInterviewRequest) {
          // Special handling for interview requests
          response = "To start an interview practice session based on this PDF, please go to the Interview tab where you can have a simulated interview experience with questions generated from your PDF content.";
        } else {
          console.log("Using regular query despite having PDF");
          response = await runQuery(prompt);
          
          // If this is a test request, make sure to mention that we have a PDF
          if (prompt.toLowerCase().includes("test") || prompt.toLowerCase().includes("quiz")) {
            response += "\n\nI notice you have a PDF uploaded. Would you like me to generate a test based on that PDF content? Just ask me to 'create a test from the PDF' or go to the Test tab.";
          }
        }
      } else {
        console.log("No PDF available or empty content, using regular query");
        response = await runQuery(prompt);
      }
      
      // Dismiss thinking toast if it exists
      if (thinkingToastId) {
        toast.dismiss(thinkingToastId);
      }

      function cleanText(text: string): string {
        if (!text) return "";
      
        return text
          .replace(/\*\*/g, "") // Removes double asterisks (**)
          .replace(/\*/g, "") // Removes single asterisks (*)
          .replace(/\*\)/g, "") // Removes `*)`
          .trim();
      }

      const cleanedResponse = cleanText(response);

      console.log("AI Response:", cleanedResponse.substring(0, 100) + "...");
      setAiResponse(cleanedResponse);
      
      // Ensure the response is spoken by the voice assistant
      console.log("Speaking response...");
      if (cleanedResponse) {
        speak(cleanedResponse);
      }
    } catch (error) {
      console.error("Error in AI response:", error);
      const errorMessage = "Sorry, I couldn't process your request. Please try again.";
      setAiResponse(errorMessage);
      speak(errorMessage);
      
      toast.error("Error processing request", {
        description: "There was a problem generating a response"
      });
    } finally {
      setIsResponding(false);
    }
  }
  
  // Check if the question is specifically about the PDF content
  function isPdfDirectQuestion(question: string): boolean {
    // Lower case for easier comparison
    const q = question.toLowerCase();
    
    // Check for questions that directly refer to the PDF
    const pdfContentPhrases = [
      "what does the document say about",
      "what is mentioned in the pdf about",
      "according to the document",
      "based on the pdf",
      "in the pdf",
      "from the document",
      "the pdf mentions",
      "tell me about the document",
      "what's in the document about",
      "content of the pdf",
      "in the uploaded file",
      "what is in the pdf",
      "what does the pdf say"
    ];
    
    // Return true if any phrase is found in the question
    return pdfContentPhrases.some(phrase => q.includes(phrase));
  }
  
  // Check if the question is a general inquiry about the PDF
  function isPdfGeneralQuestion(question: string): boolean {
    // Lower case for easier comparison
    const q = question.toLowerCase();
    
    // Check for general PDF questions
    const generalQuestions = [
      "summarize the pdf",
      "summarize the document",
      "tell me about the pdf",
      "what is the pdf about",
      "what's in the document",
      "overview of the pdf",
      "give me a summary",
      "pdf summary",
      "document summary",
      "analyze the pdf",
      "analyze the document",
      "what's the pdf about",
      "what does the pdf contain"
    ];
    
    // Return true if any phrase is found in the question
    return generalQuestions.some(phrase => q.includes(phrase));
  }

  return {
    handleFileUpload,
    isProcessingPdf,
    isPdfAnalyzed,
    pdfContent,
    pdfName,
    pdfAnalysis,
    aiResponseHandler,
    userQuery,
    aiResponse
  };
}
