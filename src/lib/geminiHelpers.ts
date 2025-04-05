
import { toast } from "sonner";

// Function to analyze PDF content
export async function analyzePdfContent(pdfText: string): Promise<string> {
  try {
    if (!pdfText || pdfText.trim().length < 100) {
      throw new Error("Insufficient PDF content to analyze");
    }

    console.log("Analyzing PDF content length:", pdfText.length);
    
    // Extract key concepts from PDF text
    const mainTopics = extractMainTopics(pdfText);
    const keyTerms = extractKeyTerms(pdfText);
    
    // Get more detailed content by extracting significant paragraphs
    const paragraphs = pdfText.split(/\n\s*\n/).filter(p => p.trim().length > 100);
    const significantParagraphs = paragraphs.slice(0, 3).map(p => p.trim());
    
    // Format the analysis response
    const analysis = `
      # PDF Analysis

      ## Overview
      This document contains ${pdfText.length} characters of text content. The content appears to cover topics related to ${mainTopics.slice(0, 3).join(", ")}.

      ## Key Topics
      ${mainTopics.map(topic => `- ${topic}`).join("\n")}

      ## Important Terms and Concepts
      ${keyTerms.map(term => `- ${term}`).join("\n")}
      
      ## Content Highlights
      ${significantParagraphs.map((para, i) => `${i+1}. ${para.length > 200 ? para.substring(0, 200) + "..." : para}`).join("\n\n")}

      ## Summary
      The document discusses various aspects of ${mainTopics[0] || "the subject matter"}. It contains information that would be valuable for quiz preparation and interview practice.
      
      ## Recommendations
      - Review the key concepts identified above
      - Create flashcards for important terms
      - Practice explaining these concepts in your own words
      - Take a mock test to assess your understanding
    `;
    
    return analysis;
  } catch (error) {
    console.error("Error analyzing PDF:", error);
    throw new Error("Failed to analyze PDF content");
  }
}

// Helper function to extract main topics from text
function extractMainTopics(text: string): string[] {
  // Simple frequency-based topic extraction
  const words = text.toLowerCase().split(/\W+/).filter(word => word.length > 4);
  const stopwords = ['about', 'above', 'after', 'again', 'against', 'these', 'those', 'their', 'there', 'which', 'while', 'would', 'should', 'could', 'thing', 'things'];
  
  // Count word frequency
  const wordCounts: Record<string, number> = {};
  for (const word of words) {
    if (word.length > 3 && !stopwords.includes(word)) {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    }
  }
  
  // Get top words by frequency
  const topics = Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));
  
  return topics.length > 0 ? topics : ["General Information"];
}

// Helper function to extract key terms
function extractKeyTerms(text: string): string[] {
  // Find capitalized terms or phrases in quotes that might be important
  const capitalizedTerms = text.match(/\b[A-Z][a-zA-Z]{2,}\b/g) || [];
  const quotedTerms = text.match(/"([^"]+)"/g) || [];
  
  // Combine and deduplicate
  const allTerms = [...new Set([
    ...capitalizedTerms,
    ...quotedTerms.map(term => term.replace(/"/g, ''))
  ])];
  
  return allTerms.slice(0, 15);
}

// Function to answer questions from PDF
export async function answerQuestionFromPdf(question: string, pdfText: string): Promise<string> {
  try {
    if (!pdfText || pdfText.trim().length < 100) {
      throw new Error("Insufficient PDF content provided");
    }

    console.log("Answering question from PDF, content length:", pdfText.length);
    console.log("Question:", question);
    
    // Extract relevant passages from the PDF that might contain the answer
    const relevantPassages = findRelevantPassages(question, pdfText);
    
    if (relevantPassages.length === 0) {
      return `I couldn't find specific information about "${question}" in your uploaded PDF. The document may not contain information related to this question. Please try asking something related to the content in your PDF.`;
    }
    
    // Formulate an answer based on relevant passages
    const answer = `
      Based on your uploaded PDF content, here's what I found regarding "${question}":

      ${relevantPassages.map((passage, index) => `${index + 1}. ${passage}`).join("\n\n")}
      
      I hope this information helps answer your question. If you need more specific details, please let me know.
    `;
    
    return answer;
  } catch (error) {
    console.error("Error answering question:", error);
    throw new Error("Failed to answer question from PDF content");
  }
}

// Helper function to find passages relevant to a question
function findRelevantPassages(question: string, text: string): string[] {
  const questionWords = question.toLowerCase().split(/\W+/).filter(word => word.length > 3);
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
  
  // Score sentences by number of question words they contain
  const scoredSentences = sentences.map(sentence => {
    const sentenceLower = sentence.toLowerCase();
    let score = 0;
    for (const word of questionWords) {
      if (sentenceLower.includes(word)) {
        score += 1;
      }
    }
    return { sentence, score };
  });
  
  // Get the top scoring sentences
  const relevantSentences = scoredSentences
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .filter(item => item.score > 0)
    .map(item => item.sentence.trim());
  
  return relevantSentences.length > 0 ? relevantSentences : 
    [sentences.length > 0 ? 
      "The document doesn't contain specific information about this query, but you can review the PDF content for related topics." :
      "The PDF content doesn't contain sufficient text to answer this question."];
}

// Function to generate mock test from PDF
export async function generateMockTest(
  pdfText: string, 
  difficulty: string = "comprehensive",
  numQuestions: number = 10,
  format: string = "mixed"
): Promise<string> {
  try {
    if (!pdfText || pdfText.trim().length < 100) {
      throw new Error("Insufficient PDF content provided");
    }

    console.log(`Generating ${difficulty} mock test with ${numQuestions} questions in ${format} format...`);
    console.log("PDF content length:", pdfText.length);
    
    // Extract topics and key concepts from the PDF
    const topics = extractMainTopics(pdfText);
    const keyTerms = extractKeyTerms(pdfText);
    
    // Generate questions based on actual content
    const sections = pdfText.split(/\n\s*\n/).filter(s => s.trim().length > 100);
    
    if (sections.length === 0 && pdfText.length > 100) {
      // If no good sections but have text, create one section with all content
      sections.push(pdfText);
    }
    
    let questions = '';
    const answers: string[] = [];
    const mcqCount = format === "mcq" ? numQuestions : format === "mixed" ? Math.ceil(numQuestions / 2) : 0;
    const shortAnswerCount = format === "short_answer" ? numQuestions : format === "mixed" ? numQuestions - mcqCount : 0;
    
    // Generate multiple choice questions
    for (let i = 0; i < mcqCount; i++) {
      if (sections.length > 0) {
        const randomSection = sections[Math.floor(Math.random() * sections.length)];
        const questionData = generateMCQFromSection(randomSection, i + 1, topics, keyTerms);
        questions += questionData.question;
        answers.push(`${i + 1}. ${questionData.answer}`);
      } else {
        // Fallback if no good sections found
        questions += `
${i + 1}. Which topic is covered in the document?
A. ${topics[0] || "General information"}
B. ${topics[1] || "Technical concepts"}
C. ${topics[2] || "Practical applications"}
D. ${topics[3] || "Advanced theory"}

`;
        answers.push(`${i + 1}. A`);
      }
    }
    
    // Generate short answer questions
    for (let i = mcqCount; i < mcqCount + shortAnswerCount; i++) {
      if (sections.length > 0) {
        const randomSection = sections[Math.floor(Math.random() * sections.length)];
        const questionData = generateShortAnswerFromSection(randomSection, i + 1, topics, keyTerms);
        questions += questionData.question;
        answers.push(`${i + 1}. ${questionData.answer}`);
      } else {
        // Fallback if no good sections found
        questions += `
${i + 1}. Explain the main concept discussed in this document related to ${topics[0] || "the subject matter"}.

`;
        answers.push(`${i + 1}. The document discusses ${topics[0] || "various concepts"} and its applications.`);
      }
    }
    
    // Construct the full test
    return `# ${topics[0] || "Subject Knowledge"} Mock Test (${difficulty.charAt(0).toUpperCase() + difficulty.slice(1)})

This test evaluates your understanding of concepts covered in the document.

${questions}
ANSWERS
${answers.join("\n")}`;
  } catch (error) {
    console.error("Error generating mock test:", error);
    throw new Error("Failed to generate mock test from PDF content");
  }
}

// Generate a multiple choice question from a section of text
function generateMCQFromSection(section: string, questionNum: number, topics: string[], keyTerms: string[]): { question: string, answer: string } {
  // Extract sentences that might contain important information
  const sentences = section.split(/[.!?]+/).filter(s => s.trim().length > 15 && s.trim().length < 150);
  
  if (sentences.length === 0) {
    // Fallback for no good sentences
    return {
      question: `
${questionNum}. What is one of the main topics discussed in the document?
A. ${topics[0] || "Topic 1"}
B. ${topics[1] || "Topic 2"}
C. ${topics[2] || "Topic 3"}
D. ${topics[3] || "Topic 4"}

`,
      answer: "A"
    };
  }
  
  // Get a random sentence to base the question on
  const targetSentence = sentences[Math.floor(Math.random() * sentences.length)].trim();
  const words = targetSentence.split(/\s+/);
  
  if (words.length < 5) {
    // Sentence too short, use fallback
    return {
      question: `
${questionNum}. According to the document, which of the following is true?
A. ${topics[0]} is a key concept
B. ${topics[1] || topics[0]} relates to ${topics[2] || keyTerms[0] || "the field"}
C. ${keyTerms[0] || topics[0]} is important for understanding ${topics[1] || "the subject"}
D. All of the above

`,
      answer: "D"
    };
  }
  
  // Generate a fill-in-the-blank or concept question
  const blankWordIndex = Math.floor(Math.random() * (words.length - 3)) + 2;
  const blankWord = words[blankWordIndex].replace(/[,.;:()]/, '');
  
  // If the blank word is too short or a common word, make a concept question instead
  if (blankWord.length < 4 || ["this", "that", "with", "from", "have", "been"].includes(blankWord.toLowerCase())) {
    // Create a concept question
    return {
      question: `
${questionNum}. What does the document suggest about ${topics[0] || keyTerms[0] || "the subject"}?
A. It's fundamental to understanding ${topics[1] || keyTerms[1] || "the topic"}
B. It's related to ${topics[2] || keyTerms[2] || "key concepts"} 
C. It requires knowledge of ${topics[3] || keyTerms[3] || "important principles"}
D. It's a specialized area within ${topics[0] || "the field"}

`,
      answer: "A"
    };
  }
  
  // Create the question with meaningful distractors
  words[blankWordIndex] = "___________";
  const questionSentence = words.join(" ");
  
  // Create options with the correct answer and plausible alternatives
  const options = [
    blankWord,
    keyTerms[0] || topics[1] || "alternative term",
    keyTerms[1] || topics[2] || "different concept",
    keyTerms[2] || topics[3] || "another option"
  ];
  
  // Shuffle options
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }
  
  // Find the position of the correct answer
  const correctOptionIndex = options.indexOf(blankWord);
  const correctOption = String.fromCharCode(65 + correctOptionIndex); // A, B, C, or D
  
  return {
    question: `
${questionNum}. ${questionSentence}
A. ${options[0]}
B. ${options[1]}
C. ${options[2]}
D. ${options[3]}

`,
    answer: correctOption
  };
}

// Generate a short answer question from a section of text
function generateShortAnswerFromSection(section: string, questionNum: number, topics: string[], keyTerms: string[]): { question: string, answer: string } {
  // Get some key concepts to ask about
  const mainTopic = topics[0] || keyTerms[0] || "the subject";
  const relatedTopic = topics[1] || keyTerms[1] || "related concepts";
  
  // Pick a question type randomly
  const questionTypes = [
    `Explain the relationship between ${mainTopic} and ${relatedTopic} as discussed in the document.`,
    `What are the key characteristics of ${mainTopic} according to the document?`,
    `Summarize the main points about ${mainTopic} from the document.`,
    `How does the document describe the importance of ${mainTopic}?`,
    `What are the practical applications of ${mainTopic} mentioned in the document?`
  ];
  
  const questionPrompt = questionTypes[Math.floor(Math.random() * questionTypes.length)];
  
  // Extract a relevant passage for the answer
  const sentences = section.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const relevantSentences = sentences.filter(s => 
    s.toLowerCase().includes(mainTopic.toLowerCase()) || 
    s.toLowerCase().includes(relatedTopic.toLowerCase())
  );
  
  let answerText = "The document discusses aspects of this topic, including its definition, applications, and importance in the field.";
  
  if (relevantSentences.length > 0) {
    // Use actual content for the answer
    answerText = relevantSentences.slice(0, 2).join(". ").trim();
  }
  
  return {
    question: `
${questionNum}. ${questionPrompt}

`,
    answer: answerText
  };
}

// Function to prepare interview questions
export async function prepareInterviewQuestions(pdfText: string, type: string = "technical"): Promise<string[]> {
  try {
    if (!pdfText) {
      throw new Error("No PDF content provided");
    }

    console.log(`Preparing ${type} interview questions from PDF content...`);
    
    // Extract topics and key concepts from the PDF
    const topics = extractMainTopics(pdfText);
    const keyTerms = extractKeyTerms(pdfText);
    
    // Generate questions based on the actual content
    const interviewQuestions = [
      `Can you explain what you know about ${topics[0] || keyTerms[0] || "this subject"}?`,
      `How would you describe the relationship between ${topics[0] || "the main topic"} and ${topics[1] || keyTerms[1] || "related concepts"}?`,
      `What experience do you have with ${topics[2] || keyTerms[2] || "these technologies or methods"}?`,
      `Describe a challenging problem you've solved related to ${topics[0] || "this field"}.`,
      `How do you stay updated with the latest developments in ${topics[0] || "this area"}?`,
      `What do you think are the most important aspects of ${topics[1] || keyTerms[0] || "this concept"}?`,
      `Can you explain how ${topics[2] || keyTerms[1] || "these principles"} work in practice?`,
      `What metrics would you use to measure success in projects related to ${topics[0] || "this field"}?`,
      `How would you implement a solution involving ${topics[1] || keyTerms[2] || "these technologies"}?`,
      `Where do you see the future of ${topics[0] || "this field"} heading in the next few years?`
    ];
    
    return interviewQuestions;
  } catch (error) {
    console.error("Error preparing interview questions:", error);
    throw new Error("Failed to prepare interview questions");
  }
}

// Function to get the next interview question
export async function getNextInterviewQuestion(currentQuestionIndex: number, allQuestions: string[]): Promise<string> {
  if (currentQuestionIndex >= allQuestions.length - 1) {
    return "That's all the questions I have for today. Thanks for participating in this interview simulation!";
  }
  
  return allQuestions[currentQuestionIndex + 1];
}

// Function to evaluate interview response
export async function evaluateInterviewResponse(question: string, answer: string, pdfContent: string): Promise<string> {
  try {
    if (!answer.trim()) {
      return "You didn't provide an answer. Would you like to try again?";
    }

    console.log("Evaluating interview response...");
    
    // Extract topics for context
    const topics = extractMainTopics(pdfContent);
    
    // Check if answer has substance
    const wordCount = answer.split(/\s+/).length;
    const hasSpecificTerms = topics.some(topic => answer.toLowerCase().includes(topic.toLowerCase()));
    
    let feedback = "";
    
    if (wordCount < 10) {
      feedback = `
        Your answer was quite brief. Consider expanding your response to show deeper knowledge.

        Strengths:
        - You provided a direct answer
        
        Areas for improvement:
        - Add more specific details and examples
        - Reference concepts from the material
        - Expand on your initial points
        
        Overall, try to elaborate more on your answers to demonstrate your knowledge.
      `;
    } else if (!hasSpecificTerms && wordCount < 30) {
      feedback = `
        Your answer has a good length but could include more specific terminology and concepts.

        Strengths:
        - You provided a reasonable explanation
        - Your answer was structured well
        
        Areas for improvement:
        - Include specific terms like "${topics[0]}" or "${topics[1]}"
        - Provide concrete examples from your experience
        - Make connections to other relevant concepts
        
        Overall, this was a good start but adding specific terminology would strengthen your response.
      `;
    } else {
      feedback = `
        That's a good answer! You demonstrated knowledge about the topic and provided sufficient detail.

        Strengths:
        - Your answer was comprehensive and well-structured
        - You included relevant terminology and concepts
        - Your explanation showed good understanding of the subject
        
        Areas for enhancement:
        - Consider adding a brief practical example to illustrate your points
        - You could mention how this relates to ${topics[0] || "the main topic"}
        
        Overall, this was a strong response that shows your grasp of the subject matter.
      `;
    }
    
    return feedback;
  } catch (error) {
    console.error("Error evaluating interview response:", error);
    return "I'm having trouble evaluating your response. Let's move on to the next question.";
  }
}

// General query function for non-PDF questions
export async function runQuery(query: string): Promise<string> {
  try {
    console.log("Processing general query:", query);
    
    return `
      I'm your AI assistant, designed to help with PDF analysis, test generation, and interview practice.

      Here are some things I can do:
      
      1. Analyze uploaded PDF documents
      2. Answer questions about the content of your PDFs
      3. Generate mock tests based on PDF content
      4. Create interview questions and provide feedback on your answers
      
      To get started, try uploading a PDF document using the upload button. Once uploaded, I can analyze it and help you interact with the content in various ways.
      
      Is there something specific you'd like to know about how to use this application?
    `;
  } catch (error) {
    console.error("Error processing query:", error);
    throw new Error("Failed to process your query. Please try again.");
  }
}
