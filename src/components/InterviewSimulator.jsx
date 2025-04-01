
import React, { useContext, useState, useRef } from "react";
import { motion } from "framer-motion";
import { DataContext } from "../context/UserContext";
import { Video, VideoOff, Mic, MicOff, Settings, Play, Loader2, Star, Send, StopCircle } from "lucide-react";
import { prepareInterviewQuestions } from "../lib/geminiHelpers";
import { toast } from "sonner";

const InterviewSimulator = () => {
  const { 
    pdfContent, 
    interviewQuestions, 
    currentInterviewQuestion,
    currentQuestionIndex,
    interviewMode,
    interviewFeedback,
    interviewScore,
    startInterviewWithCamera,
    stopInterview,
    answerInterviewQuestion,
    videoRef,
    cameraActive
  } = useContext(DataContext);
  
  const [generating, setGenerating] = useState(false);
  const [interviewSettings, setInterviewSettings] = useState({
    type: "technical",
    camera: true,
    voice: true
  });
  const [userResponse, setUserResponse] = useState("");
  const [isAnswering, setIsAnswering] = useState(false);
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  
  // Generate interview questions
  const handleGenerateQuestions = async () => {
    if (!pdfContent) {
      toast.error("No PDF content", { description: "Please upload a PDF first" });
      return;
    }
    
    try {
      setGenerating(true);
      await prepareInterviewQuestions(pdfContent, interviewSettings.type);
      toast.success("Interview questions prepared");
    } catch (error) {
      console.error("Error generating questions:", error);
      toast.error("Failed to prepare questions", { description: error.message });
    } finally {
      setGenerating(false);
    }
  };
  
  // Start recording user's answer
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
      setIsAnswering(true);
      
      toast.success("Recording started", { description: "Speak your answer clearly" });
    } catch (error) {
      console.error("Error starting recording:", error);
      toast.error("Couldn't access microphone", { description: "Please check your permissions" });
    }
  };
  
  // Stop recording user's answer
  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      
      toast.success("Recording stopped", { description: "Processing your answer..." });
    }
  };
  
  // Submit the user's answer
  const submitAnswer = async () => {
    if (!userResponse.trim() && !recording) {
      toast.error("Empty response", { description: "Please provide an answer" });
      return;
    }
    
    // If still recording, stop recording first
    if (recording) {
      stopRecording();
    }
    
    setIsAnswering(false);
    
    // Submit answer for evaluation
    await answerInterviewQuestion(userResponse);
    setUserResponse("");
  };
  
  // Render stars for score
  const renderStars = (score) => {
    if (!score) return null;
    
    const scoreOutOf5 = Math.round(score / 20);
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
          
          {interviewMode ? (
            <button
              onClick={stopInterview}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-destructive text-white hover:bg-destructive/90 transition-colors"
            >
              <VideoOff className="w-4 h-4" />
              <span>End Interview</span>
            </button>
          ) : interviewQuestions.length > 0 && (
            <button
              onClick={startInterviewWithCamera}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
            >
              <Play className="w-4 h-4" />
              <span>Start Interview</span>
            </button>
          )}
        </div>
        
        {/* Content */}
        <div className="p-6">
          {interviewMode ? (
            <div className="space-y-6">
              {/* Interview progress */}
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className="bg-primary h-2.5 rounded-full" 
                  style={{ width: `${((currentQuestionIndex + 1) / interviewQuestions.length) * 100}%` }}
                ></div>
              </div>
              
              <div className="grid md:grid-cols-2 gap-6">
                {/* Camera feed */}
                <div className="glass-card rounded-lg overflow-hidden bg-black/90 aspect-video relative">
                  {cameraActive ? (
                    <>
                      <video
                        ref={videoRef}
                        autoPlay
                        muted
                        playsInline
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-4 right-4 flex gap-2">
                        <div className={`w-3 h-3 rounded-full ${recording ? 'bg-red-500 animate-pulse' : 'bg-gray-400'}`}></div>
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
                  <div className="glass-card rounded-lg p-4 bg-white/70">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium text-sm text-primary">Question {currentQuestionIndex + 1} of {interviewQuestions.length}</h4>
                      {interviewScore && <span className="text-sm font-medium">Overall Score: {interviewScore}%</span>}
                    </div>
                    <p className="text-lg font-medium">{currentInterviewQuestion}</p>
                  </div>
                  
                  {/* Answer input */}
                  {!interviewFeedback ? (
                    <div className="glass-card rounded-lg p-4 bg-white/70 flex-grow flex flex-col">
                      <h4 className="font-medium text-sm text-primary mb-2">Your Answer:</h4>
                      <textarea 
                        value={userResponse}
                        onChange={(e) => setUserResponse(e.target.value)}
                        placeholder="Type your answer here..."
                        className="w-full p-3 border border-gray-200 rounded-md flex-grow mb-3"
                        disabled={recording}
                      ></textarea>
                      
                      <div className="flex justify-between">
                        <div className="flex gap-2">
                          {!recording ? (
                            <button
                              onClick={startRecording}
                              className="px-3 py-1.5 rounded-md bg-secondary text-white flex items-center gap-1.5"
                            >
                              <Mic size={16} />
                              <span>Record</span>
                            </button>
                          ) : (
                            <button
                              onClick={stopRecording}
                              className="px-3 py-1.5 rounded-md bg-red-500 text-white flex items-center gap-1.5 animate-pulse"
                            >
                              <StopCircle size={16} />
                              <span>Stop</span>
                            </button>
                          )}
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
                  ) : (
                    <div className="glass-card rounded-lg p-4 bg-white/70 flex-grow">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium text-sm text-primary">Feedback:</h4>
                        {renderStars(interviewScore)}
                      </div>
                      <div className="prose prose-sm max-w-none">
                        <p className="whitespace-pre-line">{interviewFeedback}</p>
                      </div>
                      
                      {currentQuestionIndex < interviewQuestions.length - 1 ? (
                        <button
                          onClick={() => setInterviewFeedback("")}
                          className="mt-4 px-4 py-2 rounded-md bg-primary text-white"
                        >
                          Next Question
                        </button>
                      ) : interviewScore && (
                        <div className="mt-4 p-3 bg-primary/10 rounded-md">
                          <h4 className="font-medium mb-1">Interview Complete</h4>
                          <p>You've completed the interview with an overall score of {interviewScore}%.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Interview settings */}
              {interviewQuestions.length === 0 && (
                <div className="mb-6 glass-card rounded-lg p-4 bg-white/50">
                  <div className="flex items-center gap-2 mb-3">
                    <Settings className="w-5 h-5 text-primary" />
                    <h4 className="font-medium">Interview Settings</h4>
                  </div>
                  
                  <div className="grid sm:grid-cols-3 gap-4">
                    {/* Interview type */}
                    <div>
                      <label className="block text-sm mb-1.5">Interview Type</label>
                      <select 
                        value={interviewSettings.type}
                        onChange={(e) => setInterviewSettings({ ...interviewSettings, type: e.target.value })}
                        className="glass-input w-full rounded-md px-3 py-1.5 text-sm"
                      >
                        <option value="technical">Technical</option>
                        <option value="conceptual">Conceptual</option>
                        <option value="comprehensive">Comprehensive</option>
                      </select>
                    </div>
                    
                    {/* Camera toggle */}
                    <div>
                      <label className="block text-sm mb-1.5">Camera</label>
                      <div className="flex items-center mt-1">
                        <button
                          type="button"
                          onClick={() => setInterviewSettings({ ...interviewSettings, camera: true })}
                          className={`px-3 py-1.5 text-sm rounded-l-md flex items-center gap-1.5 ${
                            interviewSettings.camera 
                              ? "bg-primary text-white" 
                              : "bg-white/50 border border-border"
                          }`}
                        >
                          <Video className="w-4 h-4" />
                          <span>On</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setInterviewSettings({ ...interviewSettings, camera: false })}
                          className={`px-3 py-1.5 text-sm rounded-r-md flex items-center gap-1.5 ${
                            !interviewSettings.camera 
                              ? "bg-primary text-white" 
                              : "bg-white/50 border border-l-0 border-border"
                          }`}
                        >
                          <VideoOff className="w-4 h-4" />
                          <span>Off</span>
                        </button>
                      </div>
                    </div>
                    
                    {/* Voice toggle */}
                    <div>
                      <label className="block text-sm mb-1.5">Voice</label>
                      <div className="flex items-center mt-1">
                        <button
                          type="button"
                          onClick={() => setInterviewSettings({ ...interviewSettings, voice: true })}
                          className={`px-3 py-1.5 text-sm rounded-l-md flex items-center gap-1.5 ${
                            interviewSettings.voice 
                              ? "bg-primary text-white" 
                              : "bg-white/50 border border-border"
                          }`}
                        >
                          <Mic className="w-4 h-4" />
                          <span>On</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setInterviewSettings({ ...interviewSettings, voice: false })}
                          className={`px-3 py-1.5 text-sm rounded-r-md flex items-center gap-1.5 ${
                            !interviewSettings.voice 
                              ? "bg-primary text-white" 
                              : "bg-white/50 border border-l-0 border-border"
                          }`}
                        >
                          <MicOff className="w-4 h-4" />
                          <span>Off</span>
                        </button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex justify-end">
                    <button
                      onClick={handleGenerateQuestions}
                      disabled={generating || !pdfContent}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:pointer-events-none"
                    >
                      {generating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Preparing...</span>
                        </>
                      ) : (
                        <span>Prepare Questions</span>
                      )}
                    </button>
                  </div>
                </div>
              )}
              
              {/* Questions list */}
              {interviewQuestions.length > 0 ? (
                <div className="glass-card rounded-lg p-4 bg-white/70">
                  <h4 className="font-medium mb-4">Interview Questions</h4>
                  <ul className="space-y-3">
                    {interviewQuestions.map((question, index) => (
                      <li key={index} className="glass-card p-3 rounded-lg bg-white/60 hover:bg-white/80 transition-colors">
                        <span className="inline-block w-6 h-6 text-sm bg-primary/10 text-primary rounded-full text-center leading-6 mr-2">
                          {index + 1}
                        </span>
                        {question}
                      </li>
                    ))}
                  </ul>
                  
                  <div className="mt-6 bg-primary/5 rounded-lg p-4 border border-primary/10">
                    <h5 className="text-sm font-medium text-primary mb-2">Interview Instructions</h5>
                    <p className="text-sm">
                      Click "Start Interview" to begin. The AI will ask each question and evaluate your responses.
                      Make sure your camera and microphone are enabled for the best experience.
                    </p>
                    
                    <div className="mt-3 flex justify-center">
                      <button
                        onClick={startInterviewWithCamera}
                        className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
                      >
                        <Play className="w-4 h-4" />
                        <span>Start Interview</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  {generating ? (
                    <>
                      <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                      <h3 className="text-xl font-medium mb-2">Preparing Questions</h3>
                      <p className="text-muted-foreground max-w-md">
                        Creating interview questions based on your PDF content...
                      </p>
                    </>
                  ) : (
                    <>
                      <Video className="w-12 h-12 text-muted-foreground/70 mb-4" />
                      <h3 className="text-xl font-medium mb-2">Interview Simulator</h3>
                      <p className="text-muted-foreground max-w-md">
                        {pdfContent 
                          ? "Configure your interview settings and click Prepare Questions to generate interview questions based on your PDF content."
                          : "Please upload a PDF document first to prepare interview questions."}
                      </p>
                    </>
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
