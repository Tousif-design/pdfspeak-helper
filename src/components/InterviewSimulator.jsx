
import React, { useContext, useState } from "react";
import { motion } from "framer-motion";
import { DataContext } from "../context/UserContext";
import { Video, VideoOff, Mic, MicOff, Settings, Play, Loader2 } from "lucide-react";
import { prepareInterviewQuestions } from "../lib/geminiHelpers";
import { toast } from "sonner";

const InterviewSimulator = () => {
  const { 
    pdfContent, 
    interviewQuestions, 
    currentInterviewQuestion,
    interviewMode,
    interviewFeedback,
    startInterviewWithCamera,
    stopInterview,
    videoRef,
    cameraActive
  } = useContext(DataContext);
  
  const [generating, setGenerating] = useState(false);
  const [interviewSettings, setInterviewSettings] = useState({
    type: "technical",
    camera: true,
    voice: true
  });
  
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
            <div className="grid md:grid-cols-2 gap-6">
              {/* Camera feed */}
              <div className="glass-card rounded-lg overflow-hidden bg-black/90 aspect-video">
                {cameraActive ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <VideoOff className="w-12 h-12 text-white/50" />
                  </div>
                )}
              </div>
              
              {/* Current question and feedback */}
              <div className="flex flex-col h-full">
                <div className="glass-card rounded-lg p-4 mb-4 bg-white/70">
                  <h4 className="font-medium text-sm text-primary mb-1">Current Question:</h4>
                  <p className="text-lg">{currentInterviewQuestion}</p>
                </div>
                
                {interviewFeedback && (
                  <div className="glass-card rounded-lg p-4 bg-white/70 flex-grow">
                    <h4 className="font-medium text-sm text-primary mb-1">Feedback:</h4>
                    <div className="prose prose-sm max-w-none">
                      <p>{interviewFeedback}</p>
                    </div>
                  </div>
                )}
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
