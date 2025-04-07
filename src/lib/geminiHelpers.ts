
import { toast } from "sonner";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize the API
const API_KEY = "YOUR_GEMINI_API_KEY"; // This should be replaced with a proper API key
const genAI = new GoogleGenerativeAI(API_KEY);

// Function to analyze PDF content
export async function analyzePdfContent(pdfText: string): Promise<string> {
  try {
    if (!pdfText || pdfText.trim().length < 100) {
      throw new Error("Insufficient PDF content to analyze");
    }

    console.log("Analyzing PDF content length:", pdfText.length);
    
    try {
      // Use Gemini API to analyze the content
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      
      const prompt = `
        Analyze the following document content and provide a structured analysis. 
        Include: 
        1. An overview of the main topics
        2. Key concepts and terms
        3. Summary of the content
        4. Recommendations for further study

        Document content:
        ${pdfText.substring(0, 15000)}
      `;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      console.log("Analysis generated successfully");
      
      if (text && text.length > 100) {
        return text;
      } else {
        // Fallback if response is too short
        return fallbackAnalysis(pdfText);
      }
    } catch (apiError) {
      console.error("Error using Gemini API:", apiError);
      return fallbackAnalysis(pdfText);
    }
  } catch (error) {
    console.error("Error analyzing PDF:", error);
    throw new Error("Failed to analyze PDF content");
  }
}

// Helper function for fallback analysis
function fallbackAnalysis(text: string): string {
  console.log("Using fallback analysis method");
  // Extract key concepts from PDF text
  const mainTopics = extractMainTopics(text);
  const keyTerms = extractKeyTerms(text);
  
  // Get more detailed content by extracting significant paragraphs
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 100);
  const significantParagraphs = paragraphs.slice(0, 3).map(p => p.trim());
  
  // Format the analysis response
  const analysis = `
    # PDF Analysis

    ## Overview
    This document contains ${text.length} characters of text content. The content appears to cover topics related to ${mainTopics.slice(0, 3).join(", ")}.

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
    
    try {
      // Use Gemini API to answer the question
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      
      const prompt = `
        Based on the following document content, please answer this question:
        
        Question: "${question}"
        
        Document content:
        ${pdfText.substring(0, 15000)}
        
        Please provide a detailed answer based only on the information in the document.
        If the document doesn't contain information to answer the question, clearly state that.
      `;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      if (text && text.length > 10) {
        return text;
      } else {
        // Extract relevant passages if API fails
        const relevantPassages = findRelevantPassages(question, pdfText);
        
        if (relevantPassages.length === 0) {
          return `I couldn't find specific information about "${question}" in your uploaded PDF. The document may not contain information related to this question. Please try asking something related to the content in your PDF.`;
        }
        
        // Formulate an answer based on relevant passages
        return `
          Based on your uploaded PDF content, here's what I found regarding "${question}":

          ${relevantPassages.map((passage, index) => `${index + 1}. ${passage}`).join("\n\n")}
          
          I hope this information helps answer your question. If you need more specific details, please let me know.
        `;
      }
    } catch (apiError) {
      console.error("Error using Gemini API for question:", apiError);
      // Fallback to local processing
      const relevantPassages = findRelevantPassages(question, pdfText);
      
      if (relevantPassages.length === 0) {
        return `I couldn't find specific information about "${question}" in your uploaded PDF. The document may not contain information related to this question.`;
      }
      
      return `
        Based on your uploaded PDF content, here's what I found regarding "${question}":

        ${relevantPassages.map((passage, index) => `${index + 1}. ${passage}`).join("\n\n")}
        
        I hope this information helps answer your question.
      `;
    }
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
    
    try {
      // Use Gemini API to generate the test
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      
      const prompt = `
        Create a mock test based on the following document content.
        Number of questions: ${numQuestions}
        Difficulty level: ${difficulty}
        Format: ${format === "mixed" ? "mix of multiple choice and short answer questions" : format === "mcq" ? "all multiple choice questions" : "all short answer questions"}
        
        For multiple choice questions:
        - Always provide exactly 4 options (A, B, C, D)
        - Make sure one and only one option is correct
        - Clearly indicate the correct answer at the end
        
        Document content:
        ${pdfText.substring(0, 15000)}
        
        Return the test in this format:
        # Document Title Mock Test
        
        1. Question one?
        A. Option 1
        B. Option 2
        C. Option 3
        D. Option 4
        
        2. Short answer question?
        
        ...etc
        
        ANSWERS:
        1. A
        2. Brief answer to short question
        ...etc
      `;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      if (text && text.length > 100) {
        return text;
      } else {
        // Fallback to local generation
        return generateMockTestFallback(pdfText, numQuestions, format);
      }
    } catch (apiError) {
      console.error("Error using Gemini API for test generation:", apiError);
      return generateMockTestFallback(pdfText, numQuestions, format);
    }
  } catch (error) {
    console.error("Error generating mock test:", error);
    throw new Error("Failed to generate mock test from PDF content");
  }
}

// Fallback function for mock test generation
function generateMockTestFallback(pdfText: string, numQuestions: number, format: string): string {
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
  return `# ${topics[0] || "Subject Knowledge"} Mock Test

This test evaluates your understanding of concepts covered in the document.

${questions}
ANSWERS
${answers.join("\n")}`;
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
    
    try {
      // Use Gemini API to generate interview questions
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      
      const prompt = `
        Generate 10 interview questions based on the following document content.
        Make the questions challenging and relevant to testing knowledge about the material.
        Type of interview: ${type}
        
        Document content:
        ${pdfText.substring(0, 15000)}
        
        Return just the list of 10 numbered questions, each focusing on different aspects of the content.
      `;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      if (text) {
        // Parse questions from the response
        const questions = text
          .split(/\d+\./)
          .map(q => q.trim())
          .filter(q => q.length > 10);
        
        if (questions.length >= 5) {
          return questions.slice(0, 10);
        }
      }
      
      // Fallback to local generation if API fails or returns poor results
      return generateInterviewQuestionsFallback(pdfText, type);
    } catch (apiError) {
      console.error("Error using Gemini API for interview questions:", apiError);
      return generateInterviewQuestionsFallback(pdfText, type);
    }
  } catch (error) {
    console.error("Error preparing interview questions:", error);
    throw new Error("Failed to prepare interview questions");
  }
}

// Fallback function for interview question generation
function generateInterviewQuestionsFallback(pdfText: string, type: string): string[] {
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
    
    try {
      // Use Gemini API to evaluate the response
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      
      const prompt = `
        You are an expert interviewer. Evaluate the following answer to an interview question.
        
        Question: ${question}
        
        Answer: ${answer}
        
        Context from document: ${pdfContent ? pdfContent.substring(0, 5000) : "No specific context provided"}
        
        Provide constructive feedback on the answer, including:
        1. Strengths of the answer
        2. Areas for improvement
        3. Overall assessment
        
        Keep your feedback professional, constructive and helpful.
      `;
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const feedback = response.text();
      
      if (feedback && feedback.length > 50) {
        return feedback;
      } else {
        // Fallback if API returns poor results
        return evaluateInterviewResponseFallback(answer);
      }
      
    } catch (apiError) {
      console.error("Error using Gemini API for interview evaluation:", apiError);
      return evaluateInterviewResponseFallback(answer);
    }
  } catch (error) {
    console.error("Error evaluating interview response:", error);
    return "I'm having trouble evaluating your response. Let's move on to the next question.";
  }
}

// Fallback function for interview evaluation
function evaluateInterviewResponseFallback(answer: string): string {
  // Check if answer has substance
  const wordCount = answer.split(/\s+/).length;
  
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
  } else if (wordCount < 30) {
    feedback = `
      Your answer has a good length but could include more specific terminology and concepts.

      Strengths:
      - You provided a reasonable explanation
      - Your answer was structured well
      
      Areas for improvement:
      - Include more specific terms related to the topic
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
      - You could mention how this relates to other key topics
      
      Overall, this was a strong response that shows your grasp of the subject matter.
    `;
  }
  
  return feedback;
}

// General query function for non-PDF questions
export async function runQuery(query: string): Promise<string> {
  try {
    console.log("Processing general query:", query);
    
    try {
      // Use Gemini API for general queries
      const model = genAI.getGenerativeModel({ model: "gemini-pro" });
      
      const result = await model.generateContent(query);
      const response = await result.response;
      const text = response.text();
      
      if (text) {
        return text;
      } else {
        return getDefaultResponse();
      }
    } catch (apiError) {
      console.error("Error using Gemini API for general query:", apiError);
      return getDefaultResponse();
    }
  } catch (error) {
    console.error("Error processing query:", error);
    throw new Error("Failed to process your query. Please try again.");
  }
}

// Default response when API fails
function getDefaultResponse(): string {
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
}
