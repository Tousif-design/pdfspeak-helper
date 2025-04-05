
import { useState } from "react";
import { toast } from "sonner";
import { extractTextFromPdf, validatePdfFile } from "../lib/pdfUtils";
import { analyzePdfContent, answerQuestionFromPdf, runQuery } from "../lib/geminiHelpers";

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
      
      // Show processing toast
      const processingToastId = toast.loading(`Processing ${file.name}`, {
        description: "Extracting text from PDF...",
        duration: 10000
      });
      
      const text = await extractTextFromPdf(file);
      console.log("PDF text extracted, length:", text.length);
      
      if (!text || text.trim().length < 100) {
        toast.error("PDF content extraction issue", {
          id: processingToastId,
          description: "Could not extract sufficient text from this PDF. It may be image-based or secured."
        });
        setIsProcessingPdf(false);
        return;
      }
      
      setPdfContent(text);
      
      // Update toast for analysis phase
      toast.loading(`Analyzing ${file.name}`, {
        id: processingToastId,
        description: "Analyzing PDF content..."
      });
      
      setAiResponse("Analyzing your PDF...");
      
      // Attempt to generate analysis immediately
      try {
        const analysis = await analyzePdfContent(text);
        console.log("PDF analysis complete, length:", analysis.length);
        
        if (analysis && analysis.length > 100) {
          setPdfAnalysis(analysis);
          setIsPdfAnalyzed(true);
          setAnalysisAttempts(0);
          
          // Success toast
          toast.success(`${file.name} processed`, {
            id: processingToastId,
            description: "PDF has been analyzed and is ready for questions"
          });
          
          const successMessage = `I've analyzed "${file.name}". This document is about ${text.substring(0, 100)}... Would you like me to explain the content or do you have specific questions about it?`;
          setAiResponse(successMessage);
          speak(successMessage);
        } else {
          // Generate fallback analysis if the returned analysis is too short
          const fallbackAnalysis = generateFallbackAnalysis(text, file.name);
          setPdfAnalysis(fallbackAnalysis);
          setIsPdfAnalyzed(true);
          
          toast.success(`${file.name} processed`, {
            id: processingToastId,
            description: "PDF has been analyzed with basic information"
          });
          
          const fallbackMessage = `I've analyzed "${file.name}". Would you like me to explain the content or do you have specific questions about it?`;
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
    }
  }
  
  // Generate basic analysis from text when the AI fails
  function generateFallbackAnalysis(text: string, fileName: string): string {
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
  }

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
        const noPdfMessage = "Please provide me with a PDF! I need the content of a PDF to summarize it for you. You can upload a PDF using the upload button.";
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
      
      if (pdfContent && pdfContent.length > 100) {
        console.log("PDF content available, length:", pdfContent.length);
        
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
          prompt.toLowerCase().includes("test") ||
          !prompt.toLowerCase().includes("interview") &&
          !prompt.toLowerCase().includes("quiz");
        
        console.log("isPdfQuery:", isPdfQuery, "isPdfSummaryRequest:", isPdfSummaryRequest);
        
        if (isPdfQuery) {
          if (isPdfSummaryRequest) {
            if (pdfAnalysis && !isProcessingPdf) {
              console.log("Using cached PDF analysis");
              response = pdfAnalysis;
            } else {
              console.log("Generating new PDF analysis");
              try {
                const newAnalysis = await analyzePdfContent(pdfContent);
                if (newAnalysis && newAnalysis.length > 100) {
                  setPdfAnalysis(newAnalysis);
                  response = newAnalysis;
                } else {
                  // Fallback if analysis is too short
                  const fallback = generateFallbackAnalysis(pdfContent, pdfName || "document");
                  setPdfAnalysis(fallback);
                  response = fallback;
                }
              } catch (error) {
                // Fallback on error
                console.error("Error generating analysis:", error);
                const fallback = generateFallbackAnalysis(pdfContent, pdfName || "document");
                setPdfAnalysis(fallback);
                response = fallback;
              }
            }
          } else {
            console.log("Answering specific question from PDF");
            try {
              response = await answerQuestionFromPdf(prompt, pdfContent);
            } catch (error) {
              console.error("Error answering from PDF:", error);
              response = `I encountered an error while answering your question from the PDF. Here's what I can tell you about the document:\n\n${pdfContent.substring(0, 500)}...\n\nPlease try rephrasing your question.`;
            }
          }
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
    }
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
