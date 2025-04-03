
import React from "react";
import { Book, Brain, FileText, MessageSquare, VideoIcon } from "lucide-react";

const ExampleQueries: React.FC = () => {
  return (
    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
      <div className="glass-card p-3 rounded-lg text-left hover:bg-white/90 transition-colors">
        <h4 className="font-medium text-sm mb-1 text-primary flex items-center gap-1">
          <FileText className="w-4 h-4" />
          PDF Analysis
        </h4>
        <ul className="text-sm space-y-1.5">
          <li>"Explain the main concepts in this document"</li>
          <li>"Summarize the key points"</li>
          <li>"What does this PDF tell us about [topic]?"</li>
        </ul>
      </div>
      
      <div className="glass-card p-3 rounded-lg text-left hover:bg-white/90 transition-colors">
        <h4 className="font-medium text-sm mb-1 text-primary flex items-center gap-1">
          <MessageSquare className="w-4 h-4" />
          Voice Commands
        </h4>
        <ul className="text-sm space-y-1.5">
          <li>"Generate a mock test"</li>
          <li>"Tell me about [topic in the PDF]"</li>
          <li>"Stop" (to stop the AI from speaking)</li>
        </ul>
      </div>
      
      <div className="glass-card p-3 rounded-lg text-left hover:bg-white/90 transition-colors">
        <h4 className="font-medium text-sm mb-1 text-primary flex items-center gap-1">
          <Book className="w-4 h-4" />
          Study Helpers
        </h4>
        <ul className="text-sm space-y-1.5">
          <li>"Create flashcards about [topic]"</li>
          <li>"Help me understand [concept]"</li>
          <li>"Explain [topic] in simple terms"</li>
        </ul>
      </div>
      
      <div className="glass-card p-3 rounded-lg text-left hover:bg-white/90 transition-colors">
        <h4 className="font-medium text-sm mb-1 text-primary flex items-center gap-1">
          <Brain className="w-4 h-4" />
          Learning Techniques
        </h4>
        <ul className="text-sm space-y-1.5">
          <li>"What's the best way to memorize [topic]?"</li>
          <li>"Give me study tips for [subject]"</li>
          <li>"Create a study schedule for [exam]"</li>
        </ul>
      </div>
      
      <div className="glass-card p-3 rounded-lg text-left hover:bg-white/90 transition-colors col-span-1 sm:col-span-2">
        <h4 className="font-medium text-sm mb-1 text-primary flex items-center gap-1">
          <VideoIcon className="w-4 h-4" />
          Interview Practice
        </h4>
        <ul className="text-sm space-y-1.5 grid grid-cols-1 sm:grid-cols-2 gap-x-4">
          <li>"Prepare me for an interview about [topic]"</li>
          <li>"What questions might I be asked about [subject]?"</li>
          <li>"How should I answer questions about [concept]?"</li>
          <li>"Give me feedback on my interview skills"</li>
        </ul>
      </div>
    </div>
  );
};

export default ExampleQueries;
