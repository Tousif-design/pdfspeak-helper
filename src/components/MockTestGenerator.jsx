
import React, { useContext, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DataContext } from "../context/UserContext";
import { BookOpen, AlertTriangle, Check, X, Clock, Award, ChevronRight, RotateCcw, Save } from "lucide-react";
import { generateMockTest } from "../lib/geminiHelpers";
import { toast } from "sonner";
import { downloadBlob, generatePdf } from "../lib/pdfUtils";

const MockTestGenerator = () => {
  const { pdfContent, mockTest, mockTestAnswers, handleTestSubmit, testScore } = useContext(DataContext);
  
  const [loading, setLoading] = useState(false);
  const [testStarted, setTestStarted] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(30 * 60); // 30 minutes in seconds
  const [selectedAnswers, setSelectedAnswers] = useState([]);
  const [testQuestions, setTestQuestions] = useState([]);
  const [testTitle, setTestTitle] = useState("");
  const [showAnswers, setShowAnswers] = useState(false);
  const [testType, setTestType] = useState("comprehensive");
  const [questionsCount, setQuestionsCount] = useState(10);

  // Format time remaining
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Generate test if not already generated
  const handleGenerateTest = async () => {
    if (!pdfContent) {
      toast.error("No PDF content", { description: "Please upload a PDF first" });
      return;
    }
    
    try {
      setLoading(true);
      toast.info("Generating mock test", { description: "This may take a moment..." });
      
      const generatedTest = await generateMockTest(pdfContent, testType, questionsCount);
      
      // Parse test title
      const titleMatch = generatedTest.match(/^#\s*(.*)/m) || generatedTest.match(/^([^\n]+)/);
      setTestTitle(titleMatch ? titleMatch[1] : "Mock Test");
      
      // Parse questions
      const questionsMatch = generatedTest.match(/\d+\.\s*(.*?)(?=\n\s*(?:\d+\.|ANSWERS))/gs);
      if (questionsMatch) {
        const parsedQuestions = questionsMatch.map(q => {
          // Try to identify multiple choice options
          const options = q.match(/([A-D])\.?\s*(.*?)(?=\n\s*(?:[A-D]\.|\d+\.)|\s*$)/gs);
          
          return {
            question: q.split(/\n\s*[A-D]\./).shift().replace(/^\d+\.\s*/, '').trim(),
            isMultipleChoice: !!options,
            options: options ? options.map(opt => {
              const match = opt.match(/([A-D])\.?\s*(.*)/s);
              return match ? { 
                letter: match[1], 
                text: match[2].trim() 
              } : null;
            }).filter(Boolean) : [],
            fullText: q.trim()
          };
        });
        
        setTestQuestions(parsedQuestions);
      }
      
      toast.success("Test generated", { description: "Ready to start your mock test" });
    } catch (error) {
      console.error("Error generating test:", error);
      toast.error("Failed to generate test", { description: error.message });
    } finally {
      setLoading(false);
    }
  };

  // Start the test
  const startTest = () => {
    setTestStarted(true);
    setSelectedAnswers(Array(testQuestions.length).fill(""));
    setShowAnswers(false);
    setTimeRemaining(30 * 60); // Reset timer to 30 minutes
    
    toast.success("Test started", { 
      description: "You have 30 minutes to complete the test" 
    });
  };

  // Handle answer selection
  const handleAnswerSelect = (questionIndex, answer) => {
    const newAnswers = [...selectedAnswers];
    newAnswers[questionIndex] = answer;
    setSelectedAnswers(newAnswers);
  };

  // Submit test
  const submitTest = () => {
    const unansweredCount = selectedAnswers.filter(a => !a).length;
    
    if (unansweredCount > 0 && !showAnswers) {
      toast.warning(`${unansweredCount} unanswered questions`, {
        description: "Are you sure you want to submit? You can go back and complete your answers."
      });
      return;
    }
    
    // Calculate score
    const score = handleTestSubmit(selectedAnswers);
    
    // Show answers after submission
    setShowAnswers(true);
    setTestStarted(false);
    
    toast.success("Test submitted", {
      description: `You scored ${score}% (${selectedAnswers.filter((a, i) => a === mockTestAnswers[i]).length} out of ${mockTestAnswers.length} correct)`
    });
  };

  // Reset test
  const resetTest = () => {
    setSelectedAnswers(Array(testQuestions.length).fill(""));
    setShowAnswers(false);
    setTestStarted(false);
  };

  // Export results as PDF
  const exportResults = async () => {
    try {
      toast.info("Generating PDF", { description: "Please wait..." });
      
      let content = `${testTitle}\n\n`;
      content += `Score: ${testScore}%\n\n`;
      
      testQuestions.forEach((q, index) => {
        content += `Question ${index + 1}: ${q.question}\n`;
        
        if (q.isMultipleChoice) {
          q.options.forEach(opt => {
            content += `${opt.letter}. ${opt.text}\n`;
          });
        }
        
        content += `\nYour answer: ${selectedAnswers[index]}\n`;
        content += `Correct answer: ${mockTestAnswers[index]}\n\n`;
      });
      
      const blob = await generatePdf(content, testTitle);
      downloadBlob(blob, `${testTitle}.pdf`);
      
      toast.success("PDF exported", { description: "Your test results have been saved as a PDF" });
    } catch (error) {
      console.error("Error exporting results:", error);
      toast.error("Failed to export results", { description: error.message });
    }
  };

  // Timer effect
  useEffect(() => {
    let timer;
    if (testStarted && timeRemaining > 0) {
      timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            submitTest();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => clearInterval(timer);
  }, [testStarted, timeRemaining]);

  // Initialize from existing mock test
  useEffect(() => {
    if (mockTest && testQuestions.length === 0 && !loading) {
      handleGenerateTest();
    }
  }, [mockTest]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-4xl mx-auto mt-8 glass-card rounded-xl overflow-hidden"
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-6 py-4 bg-background/70 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-lg">{testTitle || "Mock Test Generator"}</h3>
              <p className="text-sm text-muted-foreground">
                Test your knowledge based on the PDF content
              </p>
            </div>
          </div>
          
          {testStarted && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 text-amber-800 rounded-lg">
              <Clock className="w-4 h-4" />
              <span className="font-medium">{formatTime(timeRemaining)}</span>
            </div>
          )}
        </div>
        
        {/* Content */}
        <div className="p-6">
          {!testQuestions.length ? (
            <div className="text-center py-12">
              {loading ? (
                <div className="flex flex-col items-center">
                  <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4"></div>
                  <h3 className="text-xl font-medium mb-2">Generating Your Test</h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    We're creating a comprehensive test based on your PDF content. This may take a moment...
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <BookOpen className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-xl font-medium mb-2">Create a Mock Test</h3>
                  <p className="text-muted-foreground max-w-md mx-auto mb-6">
                    {pdfContent 
                      ? "Generate a test based on your PDF to check your understanding"
                      : "Please upload a PDF document first to generate a mock test"}
                  </p>
                  
                  {pdfContent && (
                    <div className="glass-card p-4 rounded-lg bg-white/50 max-w-md w-full">
                      <h4 className="font-medium mb-3 text-primary">Test Settings</h4>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm mb-1.5">Test Type</label>
                          <select 
                            value={testType}
                            onChange={(e) => setTestType(e.target.value)}
                            className="glass-input w-full rounded-md px-3 py-1.5"
                          >
                            <option value="basic">Basic</option>
                            <option value="intermediate">Intermediate</option>
                            <option value="comprehensive">Comprehensive</option>
                            <option value="advanced">Advanced</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="block text-sm mb-1.5">Number of Questions</label>
                          <select 
                            value={questionsCount}
                            onChange={(e) => setQuestionsCount(parseInt(e.target.value))}
                            className="glass-input w-full rounded-md px-3 py-1.5"
                          >
                            <option value="5">5 questions</option>
                            <option value="10">10 questions</option>
                            <option value="15">15 questions</option>
                            <option value="20">20 questions</option>
                          </select>
                        </div>
                      </div>
                      
                      <button
                        onClick={handleGenerateTest}
                        disabled={loading || !pdfContent}
                        className="mt-4 w-full py-2 bg-primary text-white rounded-md disabled:opacity-50"
                      >
                        Generate Mock Test
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : !testStarted && !showAnswers ? (
            <div className="max-w-2xl mx-auto">
              <div className="glass-card p-5 rounded-lg bg-white/50 mb-6">
                <h3 className="text-xl font-medium mb-3">{testTitle}</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  This test contains {testQuestions.length} questions based on your PDF content. 
                  You will have 30 minutes to complete the test.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center p-3 bg-primary/5 rounded-md text-sm mb-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-primary" />
                    <span>Duration: 30 minutes</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-primary" />
                    <span>Questions: {testQuestions.length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-primary" />
                    <span>Type: {testType}</span>
                  </div>
                </div>
                
                <button
                  onClick={startTest}
                  className="w-full py-2.5 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
                >
                  Start Test
                </button>
              </div>
              
              <div className="text-sm text-muted-foreground p-4 bg-secondary/5 rounded-lg">
                <h4 className="font-medium text-secondary mb-2">Test Instructions</h4>
                <ul className="space-y-1 list-disc pl-5">
                  <li>Read each question carefully before answering</li>
                  <li>For multiple choice questions, select the best answer</li>
                  <li>Your time will be displayed at the top of the screen</li>
                  <li>The test will automatically submit when time runs out</li>
                  <li>You can submit early if you finish before the time limit</li>
                </ul>
              </div>
            </div>
          ) : showAnswers ? (
            <div className="max-w-3xl mx-auto">
              <div className="glass-card p-5 rounded-lg bg-white/50 mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Award className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-medium">Test Results</h3>
                    <p className="text-sm text-muted-foreground">
                      You scored {testScore}% ({selectedAnswers.filter((a, i) => a === mockTestAnswers[i]).length} 
                      out of {mockTestAnswers.length} correct)
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-3 mt-4">
                  <button
                    onClick={resetTest}
                    className="flex items-center gap-2 px-4 py-2 rounded-md bg-secondary text-white"
                  >
                    <RotateCcw size={16} />
                    <span>Retake Test</span>
                  </button>
                  
                  <button
                    onClick={exportResults}
                    className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-white"
                  >
                    <Save size={16} />
                    <span>Export Results</span>
                  </button>
                </div>
              </div>
              
              <div className="space-y-6">
                {testQuestions.map((question, index) => {
                  const isCorrect = selectedAnswers[index] === mockTestAnswers[index];
                  
                  return (
                    <div 
                      key={index}
                      className={`glass-card p-4 rounded-lg ${
                        isCorrect ? 'bg-green-50 border border-green-100' : 'bg-red-50 border border-red-100'
                      }`}
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center mt-0.5 ${
                          isCorrect ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                        }`}>
                          {isCorrect ? <Check size={14} /> : <X size={14} />}
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {index + 1}. {question.question}
                          </h4>
                          
                          {question.isMultipleChoice && (
                            <div className="mt-3 space-y-2">
                              {question.options.map((opt) => (
                                <div 
                                  key={opt.letter}
                                  className={`p-2 rounded ${
                                    opt.letter === mockTestAnswers[index] 
                                      ? 'bg-green-100 border border-green-200' 
                                      : opt.letter === selectedAnswers[index] && selectedAnswers[index] !== mockTestAnswers[index]
                                        ? 'bg-red-100 border border-red-200'
                                        : 'bg-white/60'
                                  }`}
                                >
                                  <label className="flex items-center gap-2">
                                    <span className={`w-5 h-5 inline-flex items-center justify-center rounded-full border ${
                                      opt.letter === mockTestAnswers[index] 
                                        ? 'border-green-500 text-green-500' 
                                        : opt.letter === selectedAnswers[index] 
                                          ? 'border-red-500 text-red-500'
                                          : 'border-gray-300'
                                    }`}>
                                      {opt.letter}
                                    </span>
                                    <span>{opt.text}</span>
                                  </label>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          <div className="mt-3 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Your answer:</span>
                              <span className={isCorrect ? 'text-green-600' : 'text-red-600'}>
                                {selectedAnswers[index] || '(No answer)'}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-2 mt-1">
                              <span className="font-medium">Correct answer:</span>
                              <span className="text-green-600">{mockTestAnswers[index]}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto">
              <form onSubmit={(e) => {
                e.preventDefault();
                submitTest();
              }}>
                <div className="space-y-8 mb-8">
                  {testQuestions.map((question, index) => (
                    <div key={index} className="glass-card p-4 rounded-lg bg-white/80">
                      <h4 className="font-medium text-lg mb-3">
                        {index + 1}. {question.question}
                      </h4>
                      
                      {question.isMultipleChoice ? (
                        <div className="space-y-2 ml-1">
                          {question.options.map((opt) => (
                            <div key={opt.letter} className="p-2 hover:bg-primary/5 rounded transition-colors">
                              <label className="flex items-center gap-2 cursor-pointer">
                                <input 
                                  type="radio"
                                  name={`question-${index}`}
                                  value={opt.letter}
                                  checked={selectedAnswers[index] === opt.letter}
                                  onChange={() => handleAnswerSelect(index, opt.letter)}
                                  className="w-4 h-4 text-primary"
                                />
                                <span className="w-5 h-5 inline-flex items-center justify-center rounded-full border border-gray-300">
                                  {opt.letter}
                                </span>
                                <span>{opt.text}</span>
                              </label>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="mt-2">
                          <textarea
                            placeholder="Type your answer here..."
                            value={selectedAnswers[index] || ''}
                            onChange={(e) => handleAnswerSelect(index, e.target.value)}
                            className="w-full p-3 rounded-md border border-gray-200 min-h-[100px]"
                          />
                        </div>
                      )}
                      
                      <div className="flex justify-between mt-4">
                        <div className="text-sm text-muted-foreground">
                          {selectedAnswers[index] ? 'Answered' : 'Not answered'}
                        </div>
                        
                        {index < testQuestions.length - 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              document.getElementById(`question-${index + 1}`).scrollIntoView({ 
                                behavior: 'smooth' 
                              });
                            }}
                            className="flex items-center gap-1 text-sm text-primary"
                          >
                            Next <ChevronRight size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="sticky bottom-8 glass-card p-4 rounded-lg bg-white/90 border border-primary/10 shadow-lg">
                  <div className="flex items-center justify-between">
                    <div className="text-sm">
                      <span className="font-medium">{selectedAnswers.filter(a => a).length}</span> of {testQuestions.length} questions answered
                    </div>
                    
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={resetTest}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm"
                      >
                        Reset
                      </button>
                      
                      <button
                        type="submit"
                        className="px-6 py-2 bg-primary text-white rounded-md text-sm"
                      >
                        Submit Test
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default MockTestGenerator;
