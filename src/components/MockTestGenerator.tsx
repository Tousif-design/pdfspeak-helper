
import React, { useState, useEffect, useContext } from "react";
import { motion } from "framer-motion";
import { DataContext } from "../context/UserContext";
import { 
  BookOpen, 
  Check, 
  AlertCircle, 
  Loader2,
  FileText,
  ListChecks,
  FileQuestion,
  HelpCircle,
  Settings,
  CheckCircle2,
  RefreshCw,
  Award
} from "lucide-react";
import { toast } from "sonner";
import { generateMockTest } from "../lib/geminiHelpers";

type QuestionFormat = "mcq" | "shortAnswer" | "mixed";
type TestDifficulty = "easy" | "medium" | "hard" | "comprehensive";

interface MCQQuestion {
  id: number;
  question: string;
  options: string[];
  userAnswer: string;
  correctAnswer: string;
}

interface ShortAnswerQuestion {
  id: number;
  question: string;
  userAnswer: string;
  modelAnswer: string;
}

interface TestSettings {
  numberOfQuestions: number;
  format: QuestionFormat;
  difficulty: TestDifficulty;
  timeLimit: number;
}

const MockTestGenerator = () => {
  const { pdfContent, mockTest, mockTestAnswers, handleTestSubmit } = useContext(DataContext);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [testCompleted, setTestCompleted] = useState(false);
  const [testScore, setTestScore] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [testInProgress, setTestInProgress] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  
  // Test settings
  const [testSettings, setTestSettings] = useState<TestSettings>({
    numberOfQuestions: 10,
    format: "mixed",
    difficulty: "comprehensive",
    timeLimit: 15 // minutes
  });
  
  // Parsed questions
  const [mcqQuestions, setMcqQuestions] = useState<MCQQuestion[]>([]);
  const [shortAnswerQuestions, setShortAnswerQuestions] = useState<ShortAnswerQuestion[]>([]);
  
  // Parse mock test into structured format
  useEffect(() => {
    if (mockTest) {
      parseTest(mockTest);
    }
  }, [mockTest]);
  
  const parseTest = (testContent: string) => {
    try {
      // Extract MCQs
      const mcqRegex = /(\d+)\.\s+(.*?)\s*\n\s*A\.\s+(.*?)\s*\n\s*B\.\s+(.*?)\s*\n\s*C\.\s+(.*?)\s*\n\s*D\.\s+(.*?)(?=\n\d+\.|\n\s*ANSWERS|$)/gs;
      const mcqMatches = Array.from(testContent.matchAll(mcqRegex));
      
      const parsedMcqs: MCQQuestion[] = mcqMatches.map((match) => {
        return {
          id: parseInt(match[1]),
          question: match[2].trim(),
          options: [match[3].trim(), match[4].trim(), match[5].trim(), match[6].trim()],
          userAnswer: "",
          correctAnswer: ""
        };
      });
      
      // Extract short answer questions
      const shortAnswerRegex = /(\d+)\.\s+\[Short Answer\]\s+(.*?)(?=\n\d+\.|\n\s*ANSWERS|$)/gs;
      const shortAnswerMatches = Array.from(testContent.matchAll(shortAnswerRegex));
      
      const parsedShortAnswers: ShortAnswerQuestion[] = shortAnswerMatches.map((match) => {
        return {
          id: parseInt(match[1]),
          question: match[2].trim(),
          userAnswer: "",
          modelAnswer: ""
        };
      });
      
      // Extract answers
      const answerSection = testContent.match(/ANSWERS[\s\S]*$/i);
      if (answerSection) {
        const answerLines = answerSection[0].split("\n").filter(line => /^\d+\./.test(line));
        
        answerLines.forEach(line => {
          const match = line.match(/^(\d+)\.\s*([A-D]|.+)/);
          if (match) {
            const questionId = parseInt(match[1]);
            const answer = match[2].trim();
            
            // Find and update MCQ
            const mcqQuestion = parsedMcqs.find(q => q.id === questionId);
            if (mcqQuestion) {
              mcqQuestion.correctAnswer = answer;
            }
            
            // Find and update short answer
            const shortAnswerQuestion = parsedShortAnswers.find(q => q.id === questionId);
            if (shortAnswerQuestion) {
              shortAnswerQuestion.modelAnswer = answer;
            }
          }
        });
      }
      
      setMcqQuestions(parsedMcqs);
      setShortAnswerQuestions(parsedShortAnswers);
      
      // Set timer if not already set
      if (!timeRemaining && testSettings.timeLimit > 0) {
        setTimeRemaining(testSettings.timeLimit * 60);
        setTestInProgress(true);
      }
      
    } catch (error) {
      console.error("Error parsing test:", error);
      toast.error("Failed to parse test", { description: "Please try generating a new test" });
    }
  };
  
  const handleGenerateTest = async () => {
    if (!pdfContent) {
      toast.error("No PDF content", { description: "Please upload a PDF first" });
      return;
    }
    
    try {
      setIsGenerating(true);
      setTestCompleted(false);
      setTestScore(null);
      setMcqQuestions([]);
      setShortAnswerQuestions([]);
      
      const result = await generateMockTest(
        pdfContent, 
        testSettings.difficulty, 
        testSettings.numberOfQuestions,
        testSettings.format
      );
      
      setIsGenerating(false);
      parseTest(result);
      
      toast.success("Test generated", { 
        description: `${testSettings.numberOfQuestions} questions have been created` 
      });
      
    } catch (error) {
      console.error("Error generating test:", error);
      setIsGenerating(false);
      toast.error("Failed to generate test", { 
        description: "Please try again or upload a different PDF" 
      });
    }
  };
  
  const handleAnswerChange = (id: number, answer: string, type: "mcq" | "shortAnswer") => {
    if (type === "mcq") {
      setMcqQuestions(prev => prev.map(q => 
        q.id === id ? { ...q, userAnswer: answer } : q
      ));
    } else {
      setShortAnswerQuestions(prev => prev.map(q => 
        q.id === id ? { ...q, userAnswer: answer } : q
      ));
    }
  };
  
  const submitTest = () => {
    // Prepare answers array
    const allAnswers: string[] = [];
    
    // Add MCQ answers
    mcqQuestions.forEach(q => {
      allAnswers[q.id - 1] = q.userAnswer;
    });
    
    // Add short answer responses (these won't be auto-graded)
    shortAnswerQuestions.forEach(q => {
      allAnswers[q.id - 1] = q.userAnswer;
    });
    
    // Submit and get score
    const score = handleTestSubmit(allAnswers);
    setTestScore(score);
    setTestCompleted(true);
    setTestInProgress(false);
    setTimeRemaining(null);
    
    toast.success("Test submitted", { 
      description: `Your score: ${score}%`
    });
  };
  
  const resetTest = () => {
    setTestCompleted(false);
    setTestScore(null);
    
    // Reset answers
    setMcqQuestions(prev => prev.map(q => ({ ...q, userAnswer: "" })));
    setShortAnswerQuestions(prev => prev.map(q => ({ ...q, userAnswer: "" })));
    
    // Reset timer
    setTimeRemaining(testSettings.timeLimit * 60);
    setTestInProgress(true);
  };
  
  // Timer effect
  useEffect(() => {
    if (!testInProgress || timeRemaining === null) return;
    
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev === null || prev <= 0) {
          clearInterval(timer);
          // Auto-submit when time runs out
          if (testInProgress) {
            toast.warning("Time's up!", { description: "Your test has been automatically submitted" });
            submitTest();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [testInProgress, timeRemaining]);
  
  // Format time remaining
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-4xl mx-auto"
    >
      {/* Header */}
      <div className="bg-white/70 rounded-lg p-4 mb-6 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="font-medium text-lg">Knowledge Assessment</h2>
            <p className="text-sm text-muted-foreground">
              Test your understanding of the PDF content
            </p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {!mockTest || testCompleted ? (
            <>
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-secondary/50 text-secondary-foreground hover:bg-secondary/80 transition-colors"
              >
                <Settings className="w-4 h-4" />
                <span>Settings</span>
              </button>
              
              <button
                onClick={handleGenerateTest}
                disabled={isGenerating || !pdfContent}
                className="flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-md bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4" />
                    <span>{mockTest ? "New Test" : "Generate Test"}</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <>
              {timeRemaining !== null && (
                <div className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-1.5 ${
                  timeRemaining < 60 ? "bg-red-100 text-red-800" : "bg-blue-100 text-blue-800"
                }`}>
                  <span className="font-mono">{formatTime(timeRemaining)}</span>
                  {timeRemaining < 60 && " remaining"}
                </div>
              )}
              
              <button
                onClick={submitTest}
                className="flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-md bg-primary text-white hover:bg-primary/90 transition-colors"
              >
                <Check className="w-4 h-4" />
                <span>Submit Test</span>
              </button>
            </>
          )}
        </div>
      </div>
      
      {/* Test settings */}
      {showSettings && !mockTest && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/60 rounded-lg p-4 mb-6 shadow-sm"
        >
          <h3 className="font-medium text-sm mb-3 flex items-center gap-1.5">
            <Settings className="w-4 h-4 text-primary" />
            Test Settings
          </h3>
          
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm mb-1">Number of Questions</label>
              <select
                value={testSettings.numberOfQuestions}
                onChange={(e) => setTestSettings({
                  ...testSettings,
                  numberOfQuestions: Number(e.target.value)
                })}
                className="w-full p-2 text-sm rounded-md border border-gray-200"
              >
                <option value={5}>5 questions</option>
                <option value={10}>10 questions</option>
                <option value={15}>15 questions</option>
                <option value={20}>20 questions</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm mb-1">Question Format</label>
              <select
                value={testSettings.format}
                onChange={(e) => setTestSettings({
                  ...testSettings,
                  format: e.target.value as QuestionFormat
                })}
                className="w-full p-2 text-sm rounded-md border border-gray-200"
              >
                <option value="mcq">Multiple Choice Only</option>
                <option value="shortAnswer">Short Answer Only</option>
                <option value="mixed">Mixed Format</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm mb-1">Difficulty</label>
              <select
                value={testSettings.difficulty}
                onChange={(e) => setTestSettings({
                  ...testSettings,
                  difficulty: e.target.value as TestDifficulty
                })}
                className="w-full p-2 text-sm rounded-md border border-gray-200"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
                <option value="comprehensive">Comprehensive</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm mb-1">Time Limit</label>
              <select
                value={testSettings.timeLimit}
                onChange={(e) => setTestSettings({
                  ...testSettings,
                  timeLimit: Number(e.target.value)
                })}
                className="w-full p-2 text-sm rounded-md border border-gray-200"
              >
                <option value={0}>No time limit</option>
                <option value={5}>5 minutes</option>
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
              </select>
            </div>
          </div>
        </motion.div>
      )}
      
      {/* No PDF content */}
      {!pdfContent && (
        <div className="bg-amber-50 rounded-lg p-6 text-center">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">No PDF Uploaded</h3>
          <p className="text-sm text-amber-700 mb-4">
            Please upload a PDF document first to generate a mock test.
          </p>
        </div>
      )}
      
      {/* Test generation loading */}
      {isGenerating && (
        <div className="bg-white/70 rounded-lg p-8 text-center">
          <Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
          <h3 className="text-lg font-medium mb-2">Generating Your Test</h3>
          <p className="text-sm text-muted-foreground">
            Creating {testSettings.numberOfQuestions} {testSettings.difficulty} questions based on your PDF...
          </p>
        </div>
      )}
      
      {/* Test results */}
      {testCompleted && testScore !== null && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white/70 rounded-lg p-6 mb-6"
        >
          <div className="flex items-center justify-center mb-4">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <div className="text-2xl font-bold text-primary">{testScore}%</div>
            </div>
          </div>
          
          <h3 className="text-lg font-medium text-center mb-1">Test Completed</h3>
          <p className="text-sm text-muted-foreground text-center mb-6">
            You scored {testScore}% on this assessment
          </p>
          
          <div className="flex justify-center gap-3">
            <button
              onClick={resetTest}
              className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-secondary text-white"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry Test</span>
            </button>
            
            <button
              onClick={handleGenerateTest}
              className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-primary text-white"
            >
              <FileText className="w-4 h-4" />
              <span>New Test</span>
            </button>
          </div>
        </motion.div>
      )}
      
      {/* MCQ section */}
      {mcqQuestions.length > 0 && (
        <div className="space-y-6 mb-8">
          <div className="bg-primary/5 rounded-lg p-4">
            <h3 className="font-medium flex items-center gap-1.5 mb-1">
              <ListChecks className="w-4 h-4 text-primary" />
              Multiple Choice Questions
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Select the best answer for each question
            </p>
            
            <div className="space-y-6">
              {mcqQuestions.map((question) => (
                <div key={question.id} className={`bg-white rounded-lg p-4 shadow-sm transition-all duration-300 ${
                  testCompleted 
                    ? question.userAnswer === question.correctAnswer 
                      ? "border-l-4 border-green-500" 
                      : "border-l-4 border-red-400"
                    : ""
                }`}>
                  <div className="flex items-start gap-2 mb-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium flex-shrink-0">
                      {question.id}
                    </span>
                    <h4 className="text-base">{question.question}</h4>
                  </div>
                  
                  <div className="space-y-2 ml-8">
                    {["A", "B", "C", "D"].map((option, index) => (
                      <label 
                        key={option} 
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                          testCompleted
                            ? question.correctAnswer === option
                              ? "bg-green-100"
                              : question.userAnswer === option && question.userAnswer !== question.correctAnswer
                                ? "bg-red-100"
                                : "hover:bg-gray-50"
                            : question.userAnswer === option
                              ? "bg-primary/10"
                              : "hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`question-${question.id}`}
                          value={option}
                          checked={question.userAnswer === option}
                          onChange={() => handleAnswerChange(question.id, option, "mcq")}
                          disabled={testCompleted}
                          className="accent-primary"
                        />
                        <span className="text-sm">{option}. {question.options[index]}</span>
                        {testCompleted && question.correctAnswer === option && (
                          <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto" />
                        )}
                      </label>
                    ))}
                  </div>
                  
                  {testCompleted && question.userAnswer !== question.correctAnswer && (
                    <div className="mt-3 ml-8 p-2 bg-blue-50 rounded text-sm">
                      <p className="font-medium text-blue-700">Correct Answer: {question.correctAnswer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Short answer section */}
      {shortAnswerQuestions.length > 0 && (
        <div className="space-y-6 mb-8">
          <div className="bg-secondary/5 rounded-lg p-4">
            <h3 className="font-medium flex items-center gap-1.5 mb-1">
              <FileQuestion className="w-4 h-4 text-secondary" />
              Short Answer Questions
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              Write a brief response to each question
            </p>
            
            <div className="space-y-6">
              {shortAnswerQuestions.map((question) => (
                <div key={question.id} className="bg-white rounded-lg p-4 shadow-sm">
                  <div className="flex items-start gap-2 mb-3">
                    <span className="w-6 h-6 rounded-full bg-secondary/10 text-secondary flex items-center justify-center text-sm font-medium flex-shrink-0">
                      {question.id}
                    </span>
                    <h4 className="text-base">{question.question}</h4>
                  </div>
                  
                  <div className="space-y-4 ml-8">
                    <textarea
                      value={question.userAnswer}
                      onChange={(e) => handleAnswerChange(question.id, e.target.value, "shortAnswer")}
                      placeholder="Write your answer here..."
                      rows={3}
                      disabled={testCompleted}
                      className="w-full p-3 text-sm border border-gray-200 rounded-md focus:ring-1 focus:ring-primary focus:border-primary"
                    />
                    
                    {testCompleted && question.modelAnswer && (
                      <div className="p-3 bg-blue-50 rounded-md">
                        <p className="text-xs font-medium text-blue-700 mb-1">Model Answer:</p>
                        <p className="text-sm">{question.modelAnswer}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Empty state */}
      {!mockTest && !isGenerating && pdfContent && (
        <div className="bg-white/70 rounded-lg p-8 text-center">
          <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <BookOpen className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-medium mb-2">Ready to Test Your Knowledge</h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
            Generate a mock test based on your PDF document to assess your understanding of the content.
          </p>
          <button
            onClick={handleGenerateTest}
            className="flex items-center gap-2 bg-primary text-white py-2 px-4 rounded-md mx-auto hover:bg-primary/90 transition-colors"
          >
            <FileText className="w-4 h-4" />
            <span>Generate Test</span>
          </button>
        </div>
      )}
      
      {/* Submit button at bottom when questions are shown */}
      {(mcqQuestions.length > 0 || shortAnswerQuestions.length > 0) && !testCompleted && (
        <div className="sticky bottom-8 flex justify-center">
          <button
            onClick={submitTest}
            className="flex items-center gap-2 bg-primary text-white py-2 px-6 rounded-md shadow-lg hover:bg-primary/90 transition-colors"
          >
            <Check className="w-4 h-4" />
            <span>Submit Test</span>
          </button>
        </div>
      )}
    </motion.div>
  );
};

export default MockTestGenerator;
