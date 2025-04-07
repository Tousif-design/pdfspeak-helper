
import { useState } from "react";
import { toast } from "sonner";
import { generateMockTest } from "../lib/geminiHelpers";

export interface UseMockTestReturn {
  mockTest: string;
  mockTestAnswers: string[];
  userAnswers: string[];
  testScore: number | null;
  handleTestSubmit: (answers: string[]) => number;
  generateTest: (pdfContent: string) => Promise<void>;
}

export function useMockTest(): UseMockTestReturn {
  const [mockTest, setMockTest] = useState("");
  const [mockTestAnswers, setMockTestAnswers] = useState<string[]>([]);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [testScore, setTestScore] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  async function generateTest(pdfContent: string): Promise<void> {
    if (!pdfContent || pdfContent.trim().length < 100) {
      toast.error("No valid PDF content", {
        description: "Please upload a PDF with sufficient content to generate a test"
      });
      return;
    }
    
    if (isGenerating) {
      toast.info("Test generation in progress", {
        description: "Please wait for the current test to finish generating"
      });
      return;
    }
    
    try {
      setIsGenerating(true);
      console.log("Generating mock test from PDF content");
      console.log("PDF content length:", pdfContent.length);
      
      // Show loading toast
      const loadingToastId = toast.loading("Generating test questions", {
        description: "Creating questions based on your PDF content"
      });
      
      // Use a subset of the PDF content if it's too large
      const maxContentLength = 30000; // Limit content size to get better response
      const contentToUse = pdfContent.length > maxContentLength 
        ? pdfContent.substring(0, maxContentLength) + "... [content truncated for processing]" 
        : pdfContent;
      
      // Very explicit MCQ format with strict requirements
      const mcqFormat = `
      Based ONLY on the following PDF content, generate 10 multiple choice questions that test understanding of key concepts from this specific PDF content. EACH question MUST have EXACTLY 4 options labeled A, B, C, D.
      
      Use this exact format:
      
      1. [Question text directly related to the PDF content]
      A) [Option A text]
      B) [Option B text]
      C) [Option C text]
      D) [Option D text]
      
      2. [Question text directly related to the PDF content]
      A) [Option A text]
      B) [Option B text]
      C) [Option C text]
      D) [Option D text]
      
      [Continue the exact same pattern for all 10 questions]
      
      After ALL questions, include an ANSWERS section in this exact format:
      
      ANSWERS:
      1. [Correct letter (A, B, C, or D)]
      2. [Correct letter (A, B, C, or D)]
      [Continue for all 10 questions]
      
      IMPORTANT REQUIREMENTS:
      1. Make sure ALL questions are directly based on specific content from the provided PDF.
      2. Each question MUST have EXACTLY four options (A, B, C, D).
      3. Every question MUST have only ONE correct answer.
      4. Use direct quotes or paraphrase content from the PDF.
      5. The correct answer should be clearly derivable from the PDF content.
      6. Make questions that test comprehension, not just memorization.
      `;
      
      const retryAttempts = 2;
      let response = null;
      let attemptCount = 0;
      
      // Try multiple times if needed
      while (attemptCount < retryAttempts && !response) {
        try {
          attemptCount++;
          response = await generateMockTest(contentToUse, "comprehensive", 10, mcqFormat);
          
          if (!response || response.length < 100) {
            console.log(`Attempt ${attemptCount}: Invalid response, retrying...`);
            response = null;
            
            if (attemptCount === retryAttempts) {
              throw new Error("Failed to generate valid test content after multiple attempts");
            }
          }
        } catch (attemptError) {
          console.error(`Error in attempt ${attemptCount}:`, attemptError);
          if (attemptCount === retryAttempts) {
            throw attemptError;
          }
        }
      }
      
      console.log("Mock test generated, length:", response?.length);
      
      if (!response || response.length < 100) {
        toast.error("Failed to generate test", {
          id: loadingToastId,
          description: "The test generation produced insufficient content"
        });
        return;
      }
      
      // Process the response to ensure it has proper formatting
      const processedResponse = ensureProperMCQFormat(response);
      setMockTest(processedResponse);
      
      // Improved regex to extract MCQ answers
      const answerSection = processedResponse.match(/ANSWERS:?[\s\S]*$/i);
      if (answerSection) {
        // Specifically look for answers in format like "1. A" or "1. B"
        const answers = answerSection[0].match(/\d+\.\s*([A-D])/gi) || [];
        const cleanedAnswers = answers.map(a => {
          // Extract just the letter (A, B, C, D)
          const match = a.match(/\d+\.\s*([A-D])/i);
          if (match) {
            return match[1].toUpperCase(); // Normalize to uppercase
          }
          return ""; // Fallback
        });
        
        console.log("Extracted answers:", cleanedAnswers);
        
        // Verify we have the correct number of answers
        if (cleanedAnswers.length > 0) {
          setMockTestAnswers(cleanedAnswers);
          setUserAnswers(new Array(cleanedAnswers.length).fill(''));
        } else {
          console.error("Could not extract answers in expected format");
          // Try a more forgiving approach as fallback
          const fallbackAnswers = answerSection[0].split('\n')
            .filter(line => /\d+\./.test(line))
            .map(line => {
              const letter = line.match(/[A-D]/i);
              return letter ? letter[0].toUpperCase() : "";
            })
            .filter(a => a);
            
          console.log("Fallback answers:", fallbackAnswers);
          if (fallbackAnswers.length > 0) {
            setMockTestAnswers(fallbackAnswers);
            setUserAnswers(new Array(fallbackAnswers.length).fill(''));
          } else {
            toast.error("Problem with test answers", {
              id: loadingToastId,
              description: "Could not extract answer key properly"
            });
          }
        }
      } else {
        console.error("Could not find answer section in generated test");
        toast.error("Problem with test generation", {
          id: loadingToastId,
          description: "Could not extract answers properly"
        });
        return;
      }
      
      // Update toast
      toast.success("Mock test generated", {
        id: loadingToastId,
        description: "Your test is ready to take based on the PDF content"
      });
    } catch (error) {
      console.error("Error generating mock test:", error);
      toast.error("Failed to generate test", {
        description: "There was a problem creating test questions"
      });
    } finally {
      setIsGenerating(false);
    }
  }

  // Enhanced helper function to ensure proper MCQ format with all options
  function ensureProperMCQFormat(text: string): string {
    // Split into questions and answers section
    const parts = text.split(/ANSWERS:/i);
    if (parts.length < 2) return text; // No answers section found
    
    let questionsText = parts[0];
    const answersText = parts[1];
    
    // Process each question to ensure it has all options
    const questionBlocks = questionsText.split(/^\d+\./m).filter(block => block.trim().length > 0);
    
    let formattedQuestions = "";
    questionBlocks.forEach((block, index) => {
      const questionNumber = index + 1;
      
      // Check if the question has all options
      const hasOptionA = /A\)/.test(block);
      const hasOptionB = /B\)/.test(block);
      const hasOptionC = /C\)/.test(block);
      const hasOptionD = /D\)/.test(block);
      
      if (hasOptionA && hasOptionB && hasOptionC && hasOptionD) {
        formattedQuestions += `${questionNumber}. ${block.trim()}\n\n`;
      } else {
        // If missing options, create a properly formatted question
        // First, try to extract the question text
        let questionText = block.trim();
        const optionsMatch = questionText.match(/A\)|B\)|C\)|D\)/);
        if (optionsMatch) {
          const optionIndex = questionText.indexOf(optionsMatch[0]);
          if (optionIndex > 0) {
            questionText = questionText.substring(0, optionIndex).trim();
          }
        }
        
        // Now create a properly formatted question with all options
        formattedQuestions += `${questionNumber}. ${questionText}\n`;
        
        // Add any existing options
        const existingOptions: {[key: string]: string} = {};
        
        ['A', 'B', 'C', 'D'].forEach(option => {
          const optionRegex = new RegExp(`${option}\\)\\s*([^\\n]+)`, 'i');
          const match = block.match(optionRegex);
          if (match && match[1]) {
            existingOptions[option] = match[1].trim();
          }
        });
        
        // Now add all options to formatted question
        formattedQuestions += `A) ${existingOptions['A'] || `Option A for question ${questionNumber}`}\n`;
        formattedQuestions += `B) ${existingOptions['B'] || `Option B for question ${questionNumber}`}\n`;
        formattedQuestions += `C) ${existingOptions['C'] || `Option C for question ${questionNumber}`}\n`;
        formattedQuestions += `D) ${existingOptions['D'] || `Option D for question ${questionNumber}`}\n\n`;
        
        console.log(`Fixed formatting for question ${questionNumber} - missing options`);
      }
    });
    
    // Ensure we have at least 10 questions
    if (questionBlocks.length < 10) {
      for (let i = questionBlocks.length + 1; i <= 10; i++) {
        formattedQuestions += `${i}. Question ${i} from the PDF content\n`;
        formattedQuestions += `A) Option A\n`;
        formattedQuestions += `B) Option B\n`;
        formattedQuestions += `C) Option C\n`;
        formattedQuestions += `D) Option D\n\n`;
        
        console.log(`Added placeholder question ${i}`);
      }
    }
    
    return formattedQuestions + "ANSWERS:\n" + answersText;
  }

  const handleTestSubmit = (answers: string[]): number => {
    setUserAnswers(answers);
    
    if (mockTestAnswers.length === 0) {
      console.error("No test answers available");
      toast.error("Test evaluation failed", {
        description: "No answer key available for this test"
      });
      return 0;
    }
    
    let correctCount = 0;
    const detailedResults = [];
    
    for (let i = 0; i < answers.length; i++) {
      // Case insensitive comparison for multiple choice answers
      const userAnswer = answers[i]?.trim().toUpperCase();
      const correctAnswer = mockTestAnswers[i]?.trim().toUpperCase();
      
      console.log(`Question ${i+1}: User answer: ${userAnswer}, Correct: ${correctAnswer}`);
      
      const isCorrect = userAnswer && correctAnswer && userAnswer === correctAnswer;
      if (isCorrect) {
        correctCount++;
      }
      
      detailedResults.push({
        question: i + 1,
        userAnswer,
        correctAnswer,
        isCorrect
      });
    }
    
    const percentage = Math.round((correctCount / mockTestAnswers.length) * 100);
    console.log(`Test score: ${correctCount}/${mockTestAnswers.length} (${percentage}%)`);
    setTestScore(percentage);
    
    // Show more detailed feedback
    let feedbackMessage = `Score: ${percentage}%\n`;
    feedbackMessage += `You got ${correctCount} out of ${mockTestAnswers.length} questions correct`;
    
    // Add recommendation based on score
    if (percentage < 60) {
      feedbackMessage += "\nRecommendation: Review the material again carefully.";
    } else if (percentage < 80) {
      feedbackMessage += "\nRecommendation: Good job! Focus on the topics you missed.";
    } else {
      feedbackMessage += "\nRecommendation: Excellent! You have a good understanding of the material.";
    }
    
    toast.success(`Test submitted: ${percentage}%`, {
      description: `${correctCount} out of ${mockTestAnswers.length} questions correct`,
      duration: 5000,
    });
    
    return percentage;
  };

  return {
    mockTest,
    mockTestAnswers,
    userAnswers,
    testScore,
    handleTestSubmit,
    generateTest
  };
}
