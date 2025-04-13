
import { useState } from "react";
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
    if (!pdfContent) return;
    
    console.log("Generating mock test");
    const response = await generateMockTest(pdfContent, "comprehensive", 10, "mixed");
    setMockTest(response);
    
    const answerSection = response.match(/ANSWERS[\s\S]*$/i);
    if (answerSection) {
      const answers = answerSection[0].match(/\d+\.\s*([A-D]|.+)/g) || [];
      setMockTestAnswers(answers.map(a => a.trim()));
    }
  }

  const handleTestSubmit = (answers: string[]): number => {
    setUserAnswers(answers);
    
    let correctCount = 0;
    for (let i = 0; i < answers.length; i++) {
      if (answers[i] && mockTestAnswers[i] && 
          answers[i].toLowerCase() === mockTestAnswers[i].toLowerCase()) {
        correctCount++;
      }
    }
    
    const percentage = Math.round((correctCount / mockTestAnswers.length) * 100);
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
