
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
      
      // Very explicit format for the MCQ structure
      const mcqFormat = `
      Generate 10 multiple choice questions with EXACTLY 4 options labeled A, B, C, D for each question.
      Use this exact format:
      
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
      
      And so on...
      
      After ALL questions, include an ANSWERS section in this exact format:
      
      ANSWERS:
      1. [Correct letter (A, B, C, or D)]
      2. [Correct letter (A, B, C, or D)]
      
      And so on...
      
      Make sure all questions are specific to the PDF content provided.
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
      
      setMockTest(response);
      
      // Improved regex to extract MCQ answers
      const answerSection = response.match(/ANSWERS:?[\s\S]*$/i);
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
