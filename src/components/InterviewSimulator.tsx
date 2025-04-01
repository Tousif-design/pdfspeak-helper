
import React, { useContext, useState, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { DataContext } from "../context/UserContext";
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Settings, 
  Play, 
  Loader2, 
  Star, 
  Send, 
  StopCircle, 
  Calendar, 
  Clock, 
  User, 
  Award, 
  XCircle,
  FileText as FileTextIcon,
  AlertTriangle
} from "lucide-react";
import { prepareInterviewQuestions, evaluateInterviewResponse } from "../lib/geminiHelpers";
import { toast } from "sonner";

const InterviewSimulator = () => {
  const { 
    pdfContent, 
    interviewQuestions, 
    setInterviewQuestions,
    interviewMode,
    interviewFeedback,
    interviewScore,
    speak,
    stopSpeaking,
    videoRef,
    cameraActive,
    toggleRecognition,
    isListening,
    prepareInterviewQuestionsFromPdf,
    answerInterviewQuestion,
    startInterviewWithCamera,
    stopInterview,
    recognizedSpeech,
    setRecognizedSpeech,
    currentInterviewQuestion,
    currentQuestionIndex
  } = useContext(DataContext);
  
  const [generating, setGenerating] = useState(false);
  const [interviewSettings, setInterviewSettings] = useState({
    type: "technical",
    camera: true,
    voice: true,
    duration: 15 // minutes
  });
  const [userResponse, setUserResponse] = useState("");
  const [isAnswering, setIsAnswering] = useState(false);
  const [recording, setRecording] = useState(false);
  const [scheduledDate, setScheduledDate] = useState<Date | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [isInterviewActive, setIsInterviewActive] = useState(false);
  const [previousQuestions, setPreviousQuestions] = useState<string[]>([]);
  const [previousAnswers, setPreviousAnswers] = useState<string[]>([]);
  const [interviewProgress, setInterviewProgress] = useState(0);
  const [feedbackData, setFeedbackData] = useState<string>("");
  const [currentScore, setCurrentScore] = useState<number | null>(null);
  const [aiSpeaking, setAiSpeaking] = useState(false);
  const [waitingForAnswer, setWaitingForAnswer] = useState(false);
  const [listeningForAnswer, setListeningForAnswer] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Generate interview questions
  const generateInterviewQuestions = async () => {
    if (!pdfContent) {
      toast.error("No PDF content", { description: "Please upload a PDF first" });
      return;
    }
    
    try {
      setGenerating(true);
      const questions = await prepareInterviewQuestionsFromPdf();
      setInterviewQuestions(questions);
      setGenerating(false);
      
      toast.success("Interview prepared", { 
        description: "Ready to begin your interview" 
      });
    } catch (error) {
      console.error("Error generating interview questions:", error);
      toast.error("Failed to prepare interview", {
        description: "Please try again with a different PDF"
      });
      setGenerating(false);
    }
  };
  
  // Schedule interview for immediate start or later
  const scheduleInterview = (scheduleForLater = false) => {
    if (interviewQuestions.length === 0) {
      toast.error("No questions available", { 
        description: "Please generate questions first" 
      });
      return;
    }
    
    if (scheduleForLater) {
      // Schedule for 1 minute from now for demo purposes
      const date = new Date();
      date.setMinutes(date.getMinutes() + 1);
      setScheduledDate(date);
      
      // Set countdown
      const countdownMs = 60 * 1000; // 1 minute
      setCountdown(countdownMs);
      
      toast.success("Interview scheduled", {
        description: `Your interview will start in 1 minute at ${date.toLocaleTimeString()}`
      });
    } else {
      // Start immediately
      startInterview();
    }
  };
  
  // Start interview
  const startInterview = async () => {
    try {
      // Reset interview state
      setPreviousQuestions([]);
      setPreviousAnswers([]);
      setInterviewProgress(0);
      setCurrentScore(null);
      setFeedbackData("");
      setUserResponse("");
      setRecognizedSpeech("");
      
      // Start camera and interview
      await startInterviewWithCamera();
      
      setIsInterviewActive(true);
      setIsAnswering(true);
      setWaitingForAnswer(true);
      
      // Start voice recognition if enabled
      if (interviewSettings.voice) {
        setListeningForAnswer(true);
        toggleRecognition();
      }
      
    } catch (error) {
      console.error("Error starting interview:", error);
      toast.error("Failed to start interview", { 
        description: "Please try again" 
      });
    }
  };
  
  // Calculate speaking time based on text length
  const calculateSpeakingTime = (text: string) => {
    // Average speaking rate is about 150 words per minute
    // So we estimate ~400ms per word + 1 second buffer
    const words = text.split(' ').length;
    return Math.max(words * 400 + 1000, 3000);
  };
  
  // Submit answer
  const submitAnswer = async () => {
    // Get answer from either typed response or speech recognition
    const answer = userResponse || recognizedSpeech;
    
    if (!answer.trim()) {
      toast.error("Empty response", { description: "Please provide an answer" });
      return;
    }
    
    // Stop listening and clear timer
    if (listeningForAnswer) {
      setListeningForAnswer(false);
    }
    
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    
    setIsAnswering(false);
    setWaitingForAnswer(false);
    
    // Add current Q&A to history
    setPreviousQuestions(prev => [...prev, currentInterviewQuestion]);
    setPreviousAnswers(prev => [...prev, answer]);
    
    // Calculate progress (0 to 1)
    const newProgress = Math.min((previousQuestions.length + 1) / 10, 1);
    setInterviewProgress(newProgress);
    
    // Process the answer with the AI
    await answerInterviewQuestion(answer);
    
    // Clear user response and recognized speech
    setUserResponse("");
    setRecognizedSpeech("");
    
    // Start listening for next question
    setIsAnswering(true);
    setWaitingForAnswer(true);
    
    // Start voice recognition if still active
    if (interviewSettings.voice) {
      setListeningForAnswer(true);
    }
  };
  
  // Start recording audio
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        
        // Here you could transcribe the audio or send it for analysis
        // For now, we'll just use the typed response
        
        // Release microphone access
        mediaRecorderRef.current = null;
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setRecording(true);
      
      toast.success("Recording started", { description: "Speak your answer clearly" });
    } catch (error) {
      console.error("Error starting recording:", error);
      toast.error("Couldn't access microphone", { description: "Please check your permissions" });
    }
  };
  
  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      
      toast.success("Recording stopped", { description: "Processing your answer..." });
    }
  };
  
  // End interview
  const endInterview = () => {
    stopInterview();
    setIsInterviewActive(false);
    
    // Show completion message
    toast.success("Interview completed", { 
      description: `Your final score: ${interviewScore || 75}%` 
    });
    
    // Stop any ongoing speech
    stopSpeaking();
    
    // Clear scheduled timer if exists
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    setCountdown(null);
    setScheduledDate(null);
    
    // Reset states
    setIsAnswering(false);
    setWaitingForAnswer(false);
    setListeningForAnswer(false);
  };
  
  // Update countdown timer
  useEffect(() => {
    if (countdown === null) return;
    
    timerRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev && prev <= 1000) {
          if (timerRef.current) clearInterval(timerRef.current);
          startInterview();
          return null;
        }
        return prev ? prev - 1000 : null;
      });
    }, 1000);
    
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [countdown]);
  
  // Update interviewMode based on interviewActive
  useEffect(() => {
    if (isInterviewActive) {
      if (cameraActive && currentInterviewQuestion) {
        setInterviewProgress(currentQuestionIndex / interviewQuestions.length);
      }
    }
  }, [isInterviewActive, cameraActive, currentInterviewQuestion, currentQuestionIndex]);
  
  // Listen for speech recognition updates
  useEffect(() => {
    const handleSpeechRecognition = (event: CustomEvent) => {
      if (isAnswering && waitingForAnswer && listeningForAnswer) {
        const text = event.detail?.transcript;
        if (text) {
          setRecognizedSpeech(prev => {
            const newText = prev ? `${prev} ${text}` : text;
            return newText;
          });
          
          // Reset the auto-submit timer
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
          }
          
          // Set a new auto-submit timer
          silenceTimerRef.current = setTimeout(() => {
            if (recognizedSpeech) {
              submitAnswer();
            }
          }, 3000); // 3 seconds of silence will auto-submit
        }
      }
    };
    
    window.addEventListener('speechRecognition', handleSpeechRecognition as EventListener);
    
    return () => {
      window.removeEventListener('speechRecognition', handleSpeechRecognition as EventListener);
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
      }
    };
  }, [isAnswering, waitingForAnswer, listeningForAnswer, recognizedSpeech]);
  
  // Format countdown time
  const formatCountdown = (ms: number) => {
    if (!ms) return "";
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Render stars for score
  const renderStars = (score: number | null) => {
    if (!score) return null;
    
    const scoreOutOf5 = Math.round((score / 100) * 5);
    return (
      <div className="flex items-center gap-1">
        {Array(5).fill(0).map((_, i) => (
          <Star 
            key={i}
            size={16}
            className={i < scoreOutOf5 ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}
          />
        ))}
      </div>
    );
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
              <Video className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-lg">Interview Simulator</h3>
              <p className="text-sm text-muted-foreground">
                Practice interview questions based on your PDF
              </p>
            </div>
          </div>
          
          {isInterviewActive || cameraActive ? (
            <button
              onClick={endInterview}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive text-white hover:bg-destructive/90 transition-colors"
            >
              <VideoOff className="w-4 h-4" />
              <span>End Interview</span>
            </button>
          ) : countdown ? (
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-100 text-amber-800">
              <Clock className="w-4 h-4" />
              <span>Starting in: {formatCountdown(countdown)}</span>
            </div>
          ) : interviewQuestions.length > 0 && (
            <div className="flex gap-2">
              <button
                onClick={() => scheduleInterview(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary text-white hover:bg-secondary/90 transition-colors"
              >
                <Calendar className="w-4 h-4" />
                <span>Schedule</span>
              </button>
              <button
                onClick={() => scheduleInterview(false)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
              >
                <Play className="w-4 h-4" />
                <span>Start Now</span>
              </button>
            </div>
          )}
        </div>
        
        {/* Content */}
        <div className="p-6">
          {/* Scheduled interview countdown */}
          {countdown && !isInterviewActive && (
            <div className="mb-6 glass-card rounded-lg p-4 bg-amber-50 border border-amber-200">
              <div className="flex items-center gap-3 mb-3">
                <Calendar className="w-5 h-5 text-amber-600" />
                <h4 className="font-medium">Interview Scheduled</h4>
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span className="text-sm">
                    Starting at: {scheduledDate?.toLocaleTimeString()}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-amber-600" />
                  <span className="text-sm">
                    Interview type: {interviewSettings.type.charAt(0).toUpperCase() + interviewSettings.type.slice(1)}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span className="text-sm">
                    Duration: ~{interviewSettings.duration} minutes
                  </span>
                </div>
              </div>
              
              <div className="text-center py-4">
                <div className="text-4xl font-bold text-amber-700 mb-2">
                  {formatCountdown(countdown)}
                </div>
                <p className="text-sm text-amber-600">
                  Your interview will start automatically. Please be ready with your camera and microphone.
                </p>
              </div>
              
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    if (timerRef.current) clearInterval(timerRef.current);
                    setCountdown(null);
                    setScheduledDate(null);
                  }}
                  className="text-sm text-amber-700 hover:text-amber-900"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          
          {isInterviewActive || cameraActive ? (
            <div className="space-y-6">
              {/* Interview progress */}
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-primary h-2.5 rounded-full transition-all duration-700" 
                  style={{ width: `${(currentQuestionIndex / interviewQuestions.length) * 100}%` }}
                ></div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                {/* Camera feed */}
                <div className="glass-card rounded-lg overflow-hidden bg-black/90 aspect-video relative">
                  {interviewSettings.camera ? (
                    <>
                      <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-4 right-4 flex gap-2">
                        <div className={`w-3 h-3 rounded-full ${recording || isListening ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`}></div>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <VideoOff className="w-12 h-12 text-white/50" />
                    </div>
                  )}
                </div>
                
                {/* Current question and feedback */}
                <div className="flex flex-col h-full space-y-4">
                  {/* Question */}
                  {currentInterviewQuestion && (
                    <div className="glass-card rounded-lg p-4 bg-white/70">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium text-sm text-primary">
                          Question {currentQuestionIndex + 1} of {interviewQuestions.length}
                        </h4>
                        {currentScore !== null && (
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-medium">Score: {currentScore}%</span>
                            {renderStars(currentScore)}
                          </div>
                        )}
                      </div>
                      <p className="text-lg font-medium">{currentInterviewQuestion}</p>
                    </div>
                  )}
                  
                  {/* Answer input */}
                  {isAnswering ? (
                    <div className="glass-card rounded-lg p-4 bg-white/70 flex-grow flex flex-col">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium text-sm text-primary">Your Answer:</h4>
                        {isListening && (
                          <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-xs text-green-600">Listening...</span>
                          </div>
                        )}
                      </div>
                      
                      <textarea 
                        value={userResponse || recognizedSpeech}
                        onChange={(e) => {
                          setUserResponse(e.target.value);
                          // Reset silence timer when typing
                          if (silenceTimerRef.current) {
                            clearTimeout(silenceTimerRef.current);
                            silenceTimerRef.current = null;
                          }
                        }}
                        placeholder="Type your answer here or speak using the microphone..."
                        className="w-full p-3 border border-gray-200 rounded-md flex-grow mb-3 bg-white"
                      ></textarea>
                      
                      <div className="flex justify-between">
                        <div className="flex gap-2">
                          {interviewSettings.voice ? (
                            isListening ? (
                              <button
                                onClick={toggleRecognition}
                                className="px-3 py-1.5 rounded-md bg-green-500 text-white flex items-center gap-1.5 animate-pulse"
                              >
                                <Mic size={16} />
                                <span>Listening</span>
                              </button>
                            ) : (
                              <button
                                onClick={toggleRecognition}
                                className="px-3 py-1.5 rounded-md bg-secondary text-white flex items-center gap-1.5"
                              >
                                <MicOff size={16} />
                                <span>Start Listening</span>
                              </button>
                            )
                          ) : null}
                        </div>
                        
                        <button
                          onClick={submitAnswer}
                          className="px-3 py-1.5 rounded-md bg-primary text-white flex items-center gap-1.5"
                        >
                          <Send size={16} />
                          <span>Submit</span>
                        </button>
                      </div>
                    </div>
                  ) : interviewFeedback ? (
                    <div className="glass-card rounded-lg p-4 bg-white/70 flex-grow overflow-y-auto">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium text-sm text-primary">Feedback:</h4>
                        {renderStars(interviewScore || 0)}
                      </div>
                      <div className="prose prose-sm max-w-none">
                        <p className="whitespace-pre-line">{interviewFeedback}</p>
                      </div>
                      
                      {currentQuestionIndex >= interviewQuestions.length - 1 && interviewScore !== null && (
                        <div className="mt-4 p-3 bg-primary/10 rounded-md">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-primary flex items-center gap-1.5">
                              <Award className="w-4 h-4" />
                              Interview Complete
                            </h4>
                            <span className="text-sm font-medium">{interviewScore}%</span>
                          </div>
                          <p className="text-sm">
                            You've completed the interview. Review your feedback above or end the interview to return to the main view.
                          </p>
                          <button
                            onClick={endInterview}
                            className="mt-3 w-full py-2 rounded-md bg-primary text-white flex items-center justify-center gap-2"
                          >
                            <span>Finish & Exit</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="glass-card rounded-lg p-4 bg-white/70 flex-grow flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-12 h-12 rounded-full bg-primary/10 mx-auto mb-3 flex items-center justify-center">
                          <Mic className="w-6 h-6 text-primary" />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Waiting for the interview to begin...
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Interview settings */}
              {interviewQuestions.length === 0 && !countdown && (
                <div className="mb-6 glass-card rounded-lg p-4 bg-white/50">
                  <div className="flex items-center gap-2 mb-3">
                    <Settings className="w-5 h-5 text-primary" />
                    <h4 className="font-medium">Interview Settings</h4>
                  </div>
                  
                  <div className="grid sm:grid-cols-2 gap-4">
                    {/* Interview type */}
                    <div>
                      <label className="block text-sm mb-1.5">Interview Type</label>
                      <select 
                        value={interviewSettings.type}
                        onChange={(e) => setInterviewSettings({
                          ...interviewSettings,
                          type: e.target.value
                        })}
                        className="glass-input w-full rounded-md px-3 py-1.5 bg-white"
                      >
                        <option value="technical">Technical Interview</option>
                        <option value="behavioral">Behavioral Interview</option>
                        <option value="comprehensive">Comprehensive Interview</option>
                        <option value="assessment">Knowledge Assessment</option>
                      </select>
                      <p className="text-xs text-muted-foreground mt-1">
                        Questions will be tailored to this interview type
                      </p>
                    </div>
                    
                    {/* Duration */}
                    <div>
                      <label className="block text-sm mb-1.5">Estimated Duration</label>
                      <select 
                        value={interviewSettings.duration}
                        onChange={(e) => setInterviewSettings({
                          ...interviewSettings,
                          duration: parseInt(e.target.value)
                        })}
                        className="glass-input w-full rounded-md px-3 py-1.5 bg-white"
                      >
                        <option value="10">10 minutes</option>
                        <option value="15">15 minutes</option>
                        <option value="20">20 minutes</option>
                        <option value="30">30 minutes</option>
                      </select>
                      <p className="text-xs text-muted-foreground mt-1">
                        Actual duration may vary based on your responses
                      </p>
                    </div>
                    
                    {/* Camera toggle */}
                    <div>
                      <label className="block text-sm mb-1.5">Camera</label>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setInterviewSettings({
                            ...interviewSettings,
                            camera: true
                          })}
                          className={`flex-1 py-2 px-3 rounded-md flex items-center justify-center gap-1.5 ${
                            interviewSettings.camera 
                              ? 'bg-primary text-white' 
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          <Video size={16} />
                          <span>On</span>
                        </button>
                        <button
                          onClick={() => setInterviewSettings({
                            ...interviewSettings,
                            camera: false
                          })}
                          className={`flex-1 py-2 px-3 rounded-md flex items-center justify-center gap-1.5 ${
                            !interviewSettings.camera 
                              ? 'bg-primary text-white' 
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          <VideoOff size={16} />
                          <span>Off</span>
                        </button>
                      </div>
                    </div>
                    
                    {/* Voice toggle */}
                    <div>
                      <label className="block text-sm mb-1.5">Voice Interaction</label>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setInterviewSettings({
                            ...interviewSettings,
                            voice: true
                          })}
                          className={`flex-1 py-2 px-3 rounded-md flex items-center justify-center gap-1.5 ${
                            interviewSettings.voice 
                              ? 'bg-primary text-white' 
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          <Mic size={16} />
                          <span>On</span>
                        </button>
                        <button
                          onClick={() => setInterviewSettings({
                            ...interviewSettings,
                            voice: false
                          })}
                          className={`flex-1 py-2 px-3 rounded-md flex items-center justify-center gap-1.5 ${
                            !interviewSettings.voice 
                              ? 'bg-primary text-white' 
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          <MicOff size={16} />
                          <span>Off</span>
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <button
                      onClick={generateInterviewQuestions}
                      disabled={generating || !pdfContent}
                      className="w-full py-2.5 rounded-md bg-primary text-white flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {generating ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Preparing Interview...</span>
                        </>
                      ) : (
                        <>
                          <span>Prepare Interview</span>
                        </>
                      )}
                    </button>
                    
                    {!pdfContent && (
                      <p className="text-sm text-amber-600 mt-2 text-center">
                        Please upload a PDF document first to generate interview questions
                      </p>
                    )}
                  </div>
                </div>
              )}
              
              {/* Interview prepared, ready to start */}
              {interviewQuestions.length > 0 && !countdown && (
                <div className="mb-6 glass-card rounded-lg p-4 bg-white/50">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Video className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">Interview Ready</h3>
                      <p className="text-sm text-muted-foreground">
                        Your {interviewSettings.type} interview has been prepared
                      </p>
                    </div>
                  </div>
                  
                  <div className="mb-4 p-4 bg-primary/5 rounded-lg">
                    <h4 className="font-medium text-primary mb-2">Interview Overview:</h4>
                    <ul className="text-sm space-y-1.5">
                      <li className="flex items-center gap-2">
                        <User className="w-4 h-4 text-primary" />
                        <span>Type: {interviewSettings.type.charAt(0).toUpperCase() + interviewSettings.type.slice(1)}</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-primary" />
                        <span>Duration: Approximately {interviewSettings.duration} minutes</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <FileTextIcon className="w-4 h-4 text-primary" />
                        <span>Questions: {interviewQuestions.length} questions based on your PDF</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={() => scheduleInterview(false)}
                      className="py-2.5 rounded-md bg-primary text-white flex items-center justify-center gap-2"
                    >
                      <Play size={16} />
                      <span>Start Interview Now</span>
                    </button>
                    
                    <button
                      onClick={() => scheduleInterview(true)}
                      className="py-2.5 rounded-md bg-secondary text-white flex items-center justify-center gap-2"
                    >
                      <Calendar size={16} />
                      <span>Schedule for Later</span>
                    </button>
                    
                    <button
                      onClick={() => {
                        setInterviewQuestions([]);
                        setCurrentScore(null);
                      }}
                      className="py-2 rounded-md border border-gray-300 text-gray-700 flex items-center justify-center gap-2"
                    >
                      <XCircle size={16} />
                      <span>Discard & Reconfigure</span>
                    </button>
                  </div>
                </div>
              )}
              
              {/* Introduction */}
              {!interviewQuestions.length && !countdown && (
                <div className="text-center max-w-2xl mx-auto">
                  <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <Video className="w-10 h-10 text-primary" />
                  </div>
                  
                  <h3 className="text-xl font-medium mb-2">AI Interview Simulator</h3>
                  <p className="text-muted-foreground mb-6">
                    Practice answering questions about your PDF content in a realistic interview setting.
                    Our AI will evaluate your responses and provide feedback.
                  </p>
                  
                  <div className="grid sm:grid-cols-2 gap-4 glass-card p-4 rounded-lg bg-white/50 mb-6">
                    <div className="text-left p-3 bg-primary/5 rounded-md">
                      <h4 className="font-medium text-primary mb-2">How It Works</h4>
                      <ol className="text-sm space-y-1.5 list-decimal list-inside">
                        <li>Configure your interview settings</li>
                        <li>The AI prepares questions from your PDF</li>
                        <li>Answer questions via text or voice</li>
                        <li>Receive feedback on your responses</li>
                        <li>Get an overall score at the end</li>
                      </ol>
                    </div>
                    
                    <div className="text-left p-3 bg-secondary/5 rounded-md">
                      <h4 className="font-medium text-secondary mb-2">Features</h4>
                      <ul className="text-sm space-y-1.5">
                        <li className="flex items-center gap-2">
                          <Video className="w-4 h-4 text-secondary" />
                          <span>Camera simulation for realistic experience</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Mic className="w-4 h-4 text-secondary" />
                          <span>Voice recognition for hands-free answers</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-secondary" />
                          <span>Schedule interviews for later</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                  
                  {!pdfContent && (
                    <div className="p-4 bg-amber-50 text-amber-800 rounded-lg">
                      <AlertTriangle className="w-5 h-5 text-amber-500 mx-auto mb-2" />
                      <p className="text-sm">
                        Please upload a PDF document first to generate interview questions
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default InterviewSimulator;
