
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

  async function generateTest(pdfContent: string): Promise<void> {
    if (!pdfContent || pdfContent.trim().length < 100) {
      toast.error("No valid PDF content", {
        description: "Please upload a PDF with sufficient content to generate a test"
      });
      return;
    }
    
    try {
      console.log("Generating mock test from PDF content");
      console.log("PDF content length:", pdfContent.length);
      
      // Show loading toast
      const loadingToastId = toast.loading("Generating test questions", {
        description: "Creating questions based on your PDF content"
      });
      
      // Very explicit format for the MCQ structure to ensure all options are generated
      const mcqFormat = `
      Generate 10 multiple choice questions with EXACTLY 4 options labeled A, B, C, D for each question.
      Use this exact format without any deviation:
      
      1. [Question text]
      A) [Option A text]
      B) [Option B text]
      C) [Option C text]
      D) [Option D text]
      
      2. [Question text]
      A) [Option A text]
      B) [Option B text]
      C) [Option C text]
      D) [Option D text]
      
      (Continue this exact pattern for all 10 questions)
      
      After ALL questions, include an ANSWERS section in this exact format:
      
      ANSWERS:
      1. [Correct letter (A, B, C, or D)]
      2. [Correct letter (A, B, C, or D)]
      (And so on for all 10 questions)
      
      Make sure all questions are specific to the PDF content provided.
      Ensure EVERY question has ALL four options (A, B, C, D) without exception.
      `;
      
      const response = await generateMockTest(pdfContent, "comprehensive", 10, mcqFormat);
      console.log("Mock test generated, length:", response.length);
      
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
    }
  }

  // Helper function to ensure proper MCQ format with all options
  function ensureProperMCQFormat(text: string): string {
    // Split into questions and answers section
    const parts = text.split(/ANSWERS:/i);
    if (parts.length < 2) return text; // No answers section found
    
    let questionsText = parts[0];
    const answersText = parts[1];
    
    // Process each question to ensure it has all options
    const questionBlocks = questionsText.split(/\d+\.\s/).filter(block => block.trim().length > 0);
    
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
        const questionText = block.split(/[A-D]\)/)[0].trim();
        formattedQuestions += `${questionNumber}. ${questionText}\n`;
        formattedQuestions += `A) Option A\n`;
        formattedQuestions += `B) Option B\n`;
        formattedQuestions += `C) Option C\n`;
        formattedQuestions += `D) Option D\n\n`;
        
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
    for (let i = 0; i < answers.length; i++) {
      // Case insensitive comparison for multiple choice answers
      const userAnswer = answers[i]?.trim().toUpperCase();
      const correctAnswer = mockTestAnswers[i]?.trim().toUpperCase();
      
      console.log(`Question ${i+1}: User answer: ${userAnswer}, Correct: ${correctAnswer}`);
      
      if (userAnswer && correctAnswer) {
        // Just compare the letter for multiple choice
        if (userAnswer === correctAnswer) {
          correctCount++;
        }
      }
    }
    
    const percentage = Math.round((correctCount / mockTestAnswers.length) * 100);
    console.log(`Test score: ${correctCount}/${mockTestAnswers.length} (${percentage}%)`);
    setTestScore(percentage);
    
    toast.success(`Test submitted: Score ${percentage}%`, {
      description: `You got ${correctCount} out of ${mockTestAnswers.length} questions correct`
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
