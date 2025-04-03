
import React from "react";

const ExampleQueries: React.FC = () => {
  return (
    <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg mx-auto">
      <div className="glass-card p-3 rounded-lg text-left hover:bg-white/90 transition-colors">
        <h4 className="font-medium text-sm mb-1 text-primary">PDF Analysis</h4>
        <ul className="text-sm space-y-1.5">
          <li>"Explain the main concepts in this document"</li>
          <li>"Summarize the key points"</li>
          <li>"What does this PDF tell us about [topic]?"</li>
        </ul>
      </div>
      
      <div className="glass-card p-3 rounded-lg text-left hover:bg-white/90 transition-colors">
        <h4 className="font-medium text-sm mb-1 text-primary">Voice Commands</h4>
        <ul className="text-sm space-y-1.5">
          <li>"Generate a mock test"</li>
          <li>"Tell me about [topic in the PDF]"</li>
          <li>"Stop" (to stop the AI from speaking)</li>
        </ul>
      </div>
    </div>
  );
};

export default ExampleQueries;
