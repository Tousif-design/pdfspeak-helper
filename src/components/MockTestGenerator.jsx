
import React, { useContext, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DataContext } from "../context/UserContext";
import { FileText, Download, Settings, Loader2, CheckCircle, XCircle } from "lucide-react";
import { generateMockTest } from "../lib/geminiHelpers";
import { generatePdf, downloadBlob } from "../lib/pdfUtils";
import { toast } from "sonner";

const MockTestGenerator = () => {
  const { pdfContent, pdfName, mockTest, mockTestAnswers, handleTestSubmit } = useContext(DataContext);
  
  const [generating, setGenerating] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [testSettings, setTestSettings] = useState({
    type: "mixed",
    questions: 10,
    difficulty: "medium"
  });
  
  const [showResults, setShowResults] = useState(false);
  const [userAnswers, setUserAnswers] = useState([]);
  const [score, setScore] = useState(null);
  const [testQuestions, setTestQuestions] = useState([]);
  
  // Parse test questions when mockTest changes
  useEffect(() => {
    if (mockTest) {
      const questions = parseQuestions(mockTest);
      setTestQuestions(questions);
      setUserAnswers(Array(questions.length).fill(""));
      setShowResults(false);
      setScore(null);
    }
  }, [mockTest]);
  
  // Function to parse questions from test text
  const parseQuestions = (testText) => {
    const questions = [];
    const lines = testText.split('\n');
    
    let currentQuestion = null;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines
      if (!line) continue;
      
      // Look for question numbers (e.g., "1.", "2.", etc.)
      const questionMatch = line.match(/^(\d+)[\.\)](.+)/);
      
      if (questionMatch && !line.includes('ANSWERS')) {
        // Save previous question if exists
        if (currentQuestion) {
          questions.push(currentQuestion);
        }
        
        // Start new question
        currentQuestion = {
          id: questions.length,
          text: questionMatch[2].trim(),
          options: [],
          type: 'text' // Default to text, will update if we find options
        };
        
        // Look ahead for options (A, B, C, D)
        let j = i + 1;
        while (j < lines.length && j < i + 10) {
          const optionLine = lines[j].trim();
          const optionMatch = optionLine.match(/^([A-D])[\.\)](.+)/);
          
          if (optionMatch) {
            if (currentQuestion.options.length === 0) {
              currentQuestion.type = 'multiple';
            }
            
            currentQuestion.options.push({
              label: optionMatch[1],
              text: optionMatch[2].trim()
            });
          } else if (currentQuestion.options.length > 0 && optionLine && !optionLine.match(/^\d+[\.\)]/)) {
            // This is probably part of the last option
            const lastOption = currentQuestion.options[currentQuestion.options.length - 1];
            lastOption.text += ' ' + optionLine;
          } else if (optionLine.match(/^\d+[\.\)]/)) {
            // This is a new question, stop looking for options
            break;
          }
          
          j++;
        }
      }
    }
    
    // Add the last question
    if (currentQuestion) {
      questions.push(currentQuestion);
    }
    
    return questions;
  };
  
  // Handle user answer change
  const handleAnswerChange = (questionId, value) => {
    const newAnswers = [...userAnswers];
    newAnswers[questionId] = value;
    setUserAnswers(newAnswers);
  };
  
  // Generate a new mock test
  const handleGenerateTest = async () => {
    if (!pdfContent) {
      toast.error("No PDF content", { description: "Please upload a PDF first" });
      return;
    }
    
    try {
      setGenerating(true);
      
      const testType = testSettings.type === "mixed" 
        ? "mixed format (multiple choice, short answer, and essay questions)" 
        : testSettings.type === "multiple" 
          ? "multiple choice only" 
          : "essay questions only";
          
      const newTest = await generateMockTest(
        pdfContent, 
        testType, 
        testSettings.questions,
        testSettings.difficulty
      );
      
      toast.success("Mock test generated successfully");
    } catch (error) {
      console.error("Error generating test:", error);
      toast.error("Failed to generate test", { description: error.message });
    } finally {
      setGenerating(false);
    }
  };
  
  // Submit test for scoring
  const handleSubmit = () => {
    const testScore = handleTestSubmit(userAnswers);
    setScore(testScore);
    setShowResults(true);
  };
  
  // Download test as PDF
  const handleDownloadTest = async () => {
    if (!mockTest) return;
    
    try {
      setDownloading(true);
      const testTitle = pdfName 
        ? `Mock Test - ${pdfName}` 
        : "Mock Test";
        
      const pdfBlob = await generatePdf(mockTest, testTitle);
      downloadBlob(pdfBlob, "mock-test.pdf");
      
      toast.success("Test downloaded successfully");
    } catch (error) {
      console.error("Error downloading test:", error);
      toast.error("Failed to download test", { description: error.message });
    } finally {
      setDownloading(false);
    }
  };
  
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-4xl mx-auto mt-8 glass-card rounded-xl overflow-hidden"
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-6 py-4 bg-background/70 border-b border-border flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-lg">Mock Test Generator</h3>
              <p className="text-sm text-muted-foreground">
                Create customized tests based on your PDF
              </p>
            </div>
          </div>
          
          {mockTest && !showResults && (
            <div className="flex gap-2">
              <button
                onClick={handleSubmit}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
              >
                <CheckCircle className="w-4 h-4" />
                <span>Submit Test</span>
              </button>
              
              <button
                onClick={handleDownloadTest}
                disabled={downloading}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-white hover:bg-secondary/90 transition-colors"
              >
                {downloading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Generating PDF...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    <span>Download</span>
                  </>
                )}
              </button>
            </div>
          )}
          
          {mockTest && showResults && (
            <div className="bg-primary/10 px-4 py-2 rounded-lg">
              <span className="font-medium">Your Score: </span>
              <span className="text-lg font-bold text-primary">{score}%</span>
            </div>
          )}
        </div>
        
        {/* Content */}
        <div className="p-6">
          {/* Test settings */}
          {!mockTest && (
            <div className="mb-6 glass-card rounded-lg p-4 bg-white/50">
              <div className="flex items-center gap-2 mb-3">
                <Settings className="w-5 h-5 text-primary" />
                <h4 className="font-medium">Test Settings</h4>
              </div>
              
              <div className="grid sm:grid-cols-3 gap-4">
                {/* Test type */}
                <div>
                  <label className="block text-sm mb-1.5">Test Type</label>
                  <select 
                    value={testSettings.type}
                    onChange={(e) => setTestSettings({ ...testSettings, type: e.target.value })}
                    className="glass-input w-full rounded-md px-3 py-1.5 text-sm"
                  >
                    <option value="mixed">Mixed Format</option>
                    <option value="multiple">Multiple Choice Only</option>
                    <option value="essay">Essay Questions Only</option>
                  </select>
                </div>
                
                {/* Question count */}
                <div>
                  <label className="block text-sm mb-1.5">Number of Questions</label>
                  <select 
                    value={testSettings.questions}
                    onChange={(e) => setTestSettings({ ...testSettings, questions: Number(e.target.value) })}
                    className="glass-input w-full rounded-md px-3 py-1.5 text-sm"
                  >
                    <option value="5">5 Questions</option>
                    <option value="10">10 Questions</option>
                    <option value="15">15 Questions</option>
                    <option value="20">20 Questions</option>
                  </select>
                </div>
                
                {/* Difficulty */}
                <div>
                  <label className="block text-sm mb-1.5">Difficulty Level</label>
                  <select 
                    value={testSettings.difficulty}
                    onChange={(e) => setTestSettings({ ...testSettings, difficulty: e.target.value })}
                    className="glass-input w-full rounded-md px-3 py-1.5 text-sm"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
              </div>
              
              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleGenerateTest}
                  disabled={generating || !pdfContent}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                >
                  {generating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <span>Generate Test</span>
                  )}
                </button>
              </div>
            </div>
          )}
          
          {/* Test display */}
          <div className="prose prose-lg max-w-none">
            {mockTest && testQuestions.length > 0 ? (
              <div>
                <h2 className="text-xl font-bold mb-6">Mock Test</h2>
                
                {showResults && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                    <h3 className="text-lg font-medium text-green-800 mb-2">Test Results</h3>
                    <p className="text-green-700">
                      You answered <span className="font-bold">{score}%</span> of the questions correctly.
                    </p>
                  </div>
                )}
                
                <div className="space-y-6">
                  {testQuestions.map((question, idx) => (
                    <div 
                      key={idx} 
                      className={`glass-card p-4 rounded-lg ${
                        showResults 
                          ? userAnswers[idx] === mockTestAnswers[idx]
                            ? "bg-green-50 border border-green-200" 
                            : "bg-red-50 border border-red-200"
                          : "bg-white/70"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center text-primary font-medium">
                          {idx + 1}
                        </span>
                        <div className="flex-1">
                          <p className="font-medium mb-3">{question.text}</p>
                          
                          {question.type === 'multiple' && (
                            <div className="space-y-2 ml-1">
                              {question.options.map((option, optIdx) => (
                                <label 
                                  key={optIdx} 
                                  className={`flex items-center gap-2 p-2 rounded-md ${
                                    showResults 
                                      ? option.label === mockTestAnswers[idx]
                                        ? "bg-green-100 text-green-800" 
                                        : userAnswers[idx] === option.label && option.label !== mockTestAnswers[idx]
                                          ? "bg-red-100 text-red-800"
                                          : ""
                                      : "hover:bg-gray-100"
                                  }`}
                                >
                                  <input 
                                    type="radio" 
                                    name={`question-${idx}`} 
                                    value={option.label}
                                    checked={userAnswers[idx] === option.label}
                                    onChange={() => handleAnswerChange(idx, option.label)}
                                    disabled={showResults}
                                    className="w-4 h-4 text-primary"
                                  />
                                  <span className="flex-1">{option.label}. {option.text}</span>
                                  
                                  {showResults && option.label === mockTestAnswers[idx] && (
                                    <CheckCircle className="w-4 h-4 text-green-600" />
                                  )}
                                  
                                  {showResults && userAnswers[idx] === option.label && option.label !== mockTestAnswers[idx] && (
                                    <XCircle className="w-4 h-4 text-red-600" />
                                  )}
                                </label>
                              ))}
                            </div>
                          )}
                          
                          {question.type === 'text' && (
                            <div className="mt-2">
                              <textarea 
                                value={userAnswers[idx] || ''}
                                onChange={(e) => handleAnswerChange(idx, e.target.value)}
                                disabled={showResults}
                                placeholder="Type your answer here..."
                                className="w-full p-3 border border-gray-200 rounded-md h-24"
                              ></textarea>
                              
                              {showResults && (
                                <div className="mt-3 p-3 bg-blue-50 rounded-md">
                                  <p className="text-sm font-medium text-blue-800">Correct Answer:</p>
                                  <p className="text-blue-700">{mockTestAnswers[idx]}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {!showResults && (
                  <div className="mt-8 flex justify-center">
                    <button
                      onClick={handleSubmit}
                      className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
                    >
                      <CheckCircle className="w-5 h-5" />
                      <span>Submit Test</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                {generating ? (
                  <>
                    <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                    <h3 className="text-xl font-medium mb-2">Generating Test</h3>
                    <p className="text-muted-foreground max-w-md">
                      Creating your custom mock test. This may take a moment...
                    </p>
                  </>
                ) : (
                  <>
                    <FileText className="w-12 h-12 text-muted-foreground/70 mb-4" />
                    <h3 className="text-xl font-medium mb-2">No Test Generated</h3>
                    <p className="text-muted-foreground max-w-md">
                      {pdfContent 
                        ? "Configure your test settings and click Generate Test to create a mock test based on your PDF content."
                        : "Please upload a PDF document first to generate a mock test."}
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default MockTestGenerator;
