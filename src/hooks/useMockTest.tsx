
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
      
      // Force MCQ format by specifying "mcq" as the format parameter
      const response = await generateMockTest(pdfContent, "comprehensive", 10, "mcq");
      console.log("Mock test generated, length:", response.length);
      setMockTest(response);
      
      // Extract answers - improve the regex to better match the format
      const answerSection = response.match(/ANSWERS[\s\S]*$/i);
      if (answerSection) {
        const answers = answerSection[0].match(/\d+\.\s*([A-D]|.+)/g) || [];
        const cleanedAnswers = answers.map(a => {
          // Extract just the answer part (A, B, C, D or text after the number)
          const match = a.match(/\d+\.\s*([A-D]|.+)/);
          return match ? match[1].trim() : a.trim();
        });
        
        console.log("Extracted answers:", cleanedAnswers);
        setMockTestAnswers(cleanedAnswers);
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
      const userAnswer = answers[i]?.trim().toLowerCase();
      const correctAnswer = mockTestAnswers[i]?.trim().toLowerCase();
      
      if (userAnswer && correctAnswer) {
        // For multiple choice, just compare the letter
        if (correctAnswer.length === 1 && correctAnswer.match(/[a-d]/i)) {
          if (userAnswer === correctAnswer || userAnswer === correctAnswer.toUpperCase()) {
            correctCount++;
          }
        } 
        // For short answers, check if key parts match
        else if (userAnswer.includes(correctAnswer) || correctAnswer.includes(userAnswer)) {
          correctCount++;
        }
      }
    }
    
    const percentage = Math.round((correctCount / mockTestAnswers.length) * 100);
    console.log(`Test score: ${correctCount}/${mockTestAnswers.length} (${percentage}%)`);
    setTestScore(percentage);
    
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
