
import React, { useContext, useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { DataContext } from "../context/UserContext.tsx";
import { Video, Mic, MicOff, Camera, CameraOff, Check, X, Send, Stop } from "lucide-react";
import { toast } from "sonner";

const InterviewSimulator = () => {
  const context = useContext(DataContext);
  
  // Add a check for undefined context
  if (!context) {
    return <div className="flex items-center justify-center h-[600px]">
      <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4"></div>
      <p className="ml-3">Loading interview simulator...</p>
    </div>;
  }
  
  const { 
    pdfContent, 
    interviewMode, 
    cameraActive, 
    videoRef, 
    currentInterviewQuestion,
    currentQuestionIndex, 
    interviewQuestions,
    interviewFeedback,
    interviewScore,
    startInterviewWithCamera, 
    stopInterview,
    answerInterviewQuestion,
    prepareInterviewQuestionsFromPdf,
    setInterviewQuestions
  } = context;

  const [userResponse, setUserResponse] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isPreparing, setIsPreparing] = useState(false);
  const [customQuestions, setCustomQuestions] = useState("");
  const [isTyping, setIsTyping] = useState(true); // default to typing
  
  // Speech recognition setup
  const [recognition, setRecognition] = useState(null);
  
  useEffect(() => {
    let SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition && !recognition) {
      let recog = new SpeechRecognition();
      recog.continuous = true;
      recog.interimResults = true;
      recog.lang = "en-US";
      
      recog.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map(result => result[0].transcript)
          .join('');
        
        setUserResponse(transcript);
      };
      
      recog.onend = () => {
        setIsRecording(false);
      };
      
      setRecognition(recog);
    }
  }, []);
  
  const toggleRecording = () => {
    if (!recognition) return;
    
    if (isRecording) {
      recognition.stop();
      setIsRecording(false);
    } else {
      recognition.start();
      setIsRecording(true);
    }
  };
  
  const handlePrepareInterview = async () => {
    if (!pdfContent) {
      toast.error("No PDF content", { description: "Please upload a PDF first" });
      return;
    }
    
    try {
      setIsPreparing(true);
      const questions = await prepareInterviewQuestionsFromPdf();
      setIsPreparing(false);
      
      if (questions.length > 0) {
        toast.success("Interview ready", { 
          description: `${questions.length} questions prepared` 
        });
      }
    } catch (error) {
      setIsPreparing(false);
      toast.error("Failed to prepare questions", { description: error.message });
    }
  };
  
  const handleSubmitCustomQuestions = () => {
    if (!customQuestions.trim()) {
      toast.error("No questions provided", { 
        description: "Please enter some questions" 
      });
      return;
    }
    
    const questions = customQuestions
      .split('\n')
      .filter(q => q.trim())
      .map(q => q.trim());
    
    if (questions.length === 0) {
      toast.error("No valid questions", { 
        description: "Please enter questions, one per line" 
      });
      return;
    }
    
    setInterviewQuestions(questions);
    setCustomQuestions("");
    
    toast.success("Questions added", { 
      description: `${questions.length} custom questions ready` 
    });
  };
  
  const handleSubmitAnswer = () => {
    if (!userResponse.trim()) {
      toast.error("No answer provided", { 
        description: "Please provide an answer before submitting" 
      });
      return;
    }
    
    answerInterviewQuestion(userResponse);
    setUserResponse("");
    
    if (isRecording && recognition) {
      recognition.stop();
      setIsRecording(false);
    }
  };
  
  // Render different UI states
  if (interviewMode && cameraActive) {
    // Active interview with camera
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-4xl mx-auto mt-4 glass-card rounded-xl overflow-hidden"
      >
        <div className="flex flex-col h-full">
          <div className="px-6 py-4 bg-background/70 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Video className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium text-lg">Interview in Progress</h3>
                <p className="text-sm text-muted-foreground">
                  Question {currentQuestionIndex + 1} of {interviewQuestions.length}
                </p>
              </div>
            </div>
            
            <button
              onClick={stopInterview}
              className="px-3 py-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-1.5"
            >
              <Stop className="w-4 h-4" />
              <span>End Interview</span>
            </button>
          </div>
          
          <div className="p-6 bg-background/5">
            <div className="mb-6">
              <div className="glass-card p-4 rounded-lg bg-white/70 mb-4">
                <h4 className="font-medium mb-2">Current Question:</h4>
                <p className="text-lg">{currentInterviewQuestion}</p>
              </div>
              
              {interviewFeedback && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card p-4 rounded-lg bg-primary/5 mb-4"
                >
                  <h4 className="font-medium mb-2">Feedback:</h4>
                  <p>{interviewFeedback}</p>
                </motion.div>
              )}
              
              {interviewScore !== null && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass-card p-4 rounded-lg bg-green-50 border border-green-100 mb-4"
                >
                  <h4 className="font-medium mb-2">Interview Complete</h4>
                  <p>Your overall score: <span className="font-medium text-lg">{interviewScore}%</span></p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Thanks for completing the interview! You can now end the session.
                  </p>
                </motion.div>
              )}
            </div>
            
            <div className="flex flex-col md:flex-row gap-6">
              <div className="w-full md:w-1/2">
                <div className="aspect-video bg-black rounded-lg overflow-hidden relative mb-4">
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    muted 
                    className="w-full h-full object-cover"
                  />
                  
                  <div className="absolute bottom-3 right-3 flex gap-2">
                    <button
                      onClick={toggleRecording}
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isRecording ? 'bg-red-500 text-white' : 'bg-white text-gray-800'
                      }`}
                    >
                      {isRecording ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                
                <div className="flex gap-2 mb-2">
                  <button 
                    onClick={() => setIsTyping(true)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 ${
                      isTyping ? 'bg-primary text-white' : 'bg-gray-100'
                    }`}
                  >
                    Type
                  </button>
                  
                  <button 
                    onClick={() => {
                      setIsTyping(false);
                      if (recognition && !isRecording) {
                        recognition.start();
                        setIsRecording(true);
                      }
                    }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1.5 ${
                      !isTyping ? 'bg-primary text-white' : 'bg-gray-100'
                    }`}
                    disabled={!recognition}
                  >
                    <Mic className="w-4 h-4" />
                    Speak
                  </button>
                </div>
              </div>
              
              <div className="w-full md:w-1/2">
                <div className="glass-card p-4 rounded-lg bg-white/70 h-full flex flex-col">
                  <h4 className="font-medium mb-2">Your Answer:</h4>
                  
                  <textarea
                    value={userResponse}
                    onChange={(e) => setUserResponse(e.target.value)}
                    placeholder="Type or speak your answer here..."
                    className="flex-1 p-3 rounded-md border border-gray-200 bg-white min-h-[150px] text-sm"
                    disabled={!isTyping && isRecording}
                  />
                  
                  <div className="flex justify-end mt-4">
                    <button
                      onClick={handleSubmitAnswer}
                      disabled={!userResponse.trim()}
                      className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      Submit Answer
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    );
  }
  
  // Setup interview UI
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-4xl mx-auto mt-8 glass-card rounded-xl overflow-hidden"
    >
      <div className="flex flex-col h-full">
        <div className="px-6 py-4 bg-background/70 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Video className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-lg">Interview Simulator</h3>
              <p className="text-sm text-muted-foreground">
                Practice your interview skills with AI feedback
              </p>
            </div>
          </div>
        </div>
        
        <div className="p-6">
          {isPreparing ? (
            <div className="text-center py-12">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4"></div>
                <h3 className="text-xl font-medium mb-2">Preparing Interview Questions</h3>
                <p className="text-muted-foreground max-w-md mx-auto">
                  We're analyzing your PDF content to create relevant interview questions...
                </p>
              </div>
            </div>
          ) : interviewQuestions.length > 0 ? (
            <div className="max-w-3xl mx-auto">
              <div className="glass-card p-5 rounded-lg bg-white/50 mb-6">
                <h3 className="text-xl font-medium mb-3">Interview Ready</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {interviewQuestions.length} questions have been prepared based on your PDF content.
                  Start the interview when you're ready.
                </p>
                
                <div className="p-4 bg-gray-50 rounded-lg mb-4">
                  <h4 className="font-medium mb-2">Sample Questions:</h4>
                  <ul className="space-y-2">
                    {interviewQuestions.slice(0, 3).map((q, i) => (
                      <li key={i} className="text-sm">{i + 1}. {q}</li>
                    ))}
                    {interviewQuestions.length > 3 && (
                      <li className="text-sm text-muted-foreground">+{interviewQuestions.length - 3} more questions...</li>
                    )}
                  </ul>
                </div>
                
                <button
                  onClick={startInterviewWithCamera}
                  className="w-full py-2.5 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                >
                  <Camera className="w-4 h-4" />
                  <span>Start Interview with Camera</span>
                </button>
              </div>
              
              <div className="glass-card p-5 rounded-lg">
                <h3 className="font-medium mb-3">Options</h3>
                
                <div className="space-y-4">
                  <button
                    onClick={handlePrepareInterview}
                    className="w-full py-2 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Regenerate Questions
                  </button>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Add Custom Questions</h4>
                    <textarea
                      value={customQuestions}
                      onChange={(e) => setCustomQuestions(e.target.value)}
                      placeholder="Enter questions, one per line..."
                      className="w-full p-3 rounded-md border border-gray-200 min-h-[100px] text-sm mb-2"
                    />
                    <button
                      onClick={handleSubmitCustomQuestions}
                      disabled={!customQuestions.trim()}
                      className="w-full py-2 bg-secondary text-white rounded-md hover:bg-secondary/90 transition-colors disabled:opacity-50"
                    >
                      Add Custom Questions
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="flex flex-col items-center">
                <Video className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-xl font-medium mb-2">Interview Simulator</h3>
                <p className="text-muted-foreground max-w-md mx-auto mb-6">
                  {pdfContent 
                    ? "Generate interview questions based on your PDF to practice your skills"
                    : "Please upload a PDF document first to generate interview questions"}
                </p>
                
                {pdfContent && (
                  <div className="flex gap-3">
                    <button
                      onClick={handlePrepareInterview}
                      className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
                    >
                      Prepare Interview Questions
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default InterviewSimulator;
