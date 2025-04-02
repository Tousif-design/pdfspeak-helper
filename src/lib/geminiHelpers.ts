import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { toast } from "sonner";

const API_KEY = "AIzaSyCaptz9D2gdfApn9b2CBeAWdWeCuucZh9A";
const genAI = new GoogleGenerativeAI(API_KEY);

// Initialize the default model
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
});

// Default generation config
const defaultGenerationConfig = {
  temperature: 0.8,
  topP: 0.95,
  topK: 40,
  maxOutputTokens: 4000,
};

/**
 * Runs a query against the Gemini model
 */
export async function runQuery(prompt: string, config = {}) {
  try {
    console.log("Sending query to Gemini:", prompt.substring(0, 100) + "...");
    const generationConfig = { ...defaultGenerationConfig, ...config };
    
    const chatSession = model.startChat({
      generationConfig,
      history: [],
    });

    const result = await chatSession.sendMessage(prompt);
    const responseText = await result.response.text();
    console.log("Response received from Gemini");
    return responseText;
  } catch (error) {
    console.error("AI Error:", error);
    toast.error("AI service error", { description: "Failed to process your request" });
    throw new Error("AI service failed to process the request");
  }
}

/**
 * Analyzes the content of a PDF
 */
export async function analyzePdfContent(pdfText: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  // Improve the prompt for better PDF analysis
  const prompt = `
You are a knowledgeable AI assistant tasked with analyzing and summarizing PDF content.

PDF CONTENT:
\`\`\`
${pdfText.substring(0, 20000)}
\`\`\`

Provide a comprehensive analysis of this PDF document, organizing your response in the following sections:

1. EXECUTIVE SUMMARY
A concise 2-3 paragraph overview of the entire document highlighting its purpose and main points.

2. KEY CONCEPTS
Identify and explain the 5-7 most important concepts or topics covered in the document.

3. MAIN ARGUMENTS/FINDINGS
Summarize the principal arguments, findings, or conclusions presented in the document.

4. TECHNICAL TERMINOLOGY
List and provide brief definitions for any specialized or technical terms found in the document.

5. RECOMMENDATIONS (if applicable)
Outline any recommendations, suggestions, or calls to action mentioned in the document.

Make your analysis detailed, factual, and directly based on the document content. If the document is too long and you only have partial content, note this in your response.
`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    return response;
  } catch (error) {
    console.error("Error analyzing PDF content:", error);
    throw new Error("Failed to analyze PDF content");
  }
}

/**
 * Answers questions based on PDF content
 */
export async function answerQuestionFromPdf(question: string, pdfText: string): Promise<string> {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  // Improve the prompt for better question answering
  const prompt = `
You are a knowledgeable AI assistant tasked with answering questions about a PDF document.

PDF CONTENT:
\`\`\`
${pdfText.substring(0, 15000)}
\`\`\`

USER QUESTION: ${question}

Provide a comprehensive, accurate answer based exclusively on the information in the PDF. 
If the answer cannot be found in the document, clearly state this.
Structure your answer in a clear, organized manner.
Include relevant quotes or page references from the PDF if possible.
If you can only access part of the document, mention this limitation in your response.

Your answer should be detailed, factual, and directly relevant to the question asked.
`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    return response;
  } catch (error) {
    console.error("Error answering question from PDF:", error);
    throw new Error("Failed to answer question from PDF");
  }
}

/**
 * Generates a mock test based on PDF content
 */
export async function generateMockTest(
  pdfText: string, 
  difficulty: string = "comprehensive",
  numQuestions: number = 10,
  format: string = "mixed"
): Promise<string> {
  const model = genAI.getGenerativeModel({ model: "gemini-pro" });

  // Define question distribution based on format
  let mcqCount = numQuestions;
  let shortAnswerCount = 0;

  if (format === "mixed") {
    mcqCount = Math.ceil(numQuestions * 0.7); // 70% MCQs
    shortAnswerCount = numQuestions - mcqCount; // 30% short answer
  } else if (format === "shortAnswer") {
    mcqCount = 0;
    shortAnswerCount = numQuestions;
  }

  // Improve the prompt for better test generation
  const prompt = `
You are an experienced educator tasked with creating a comprehensive assessment based on the provided PDF content.

PDF CONTENT:
\`\`\`
${pdfText.substring(0, 20000)}
\`\`\`

CREATE A ${difficulty.toUpperCase()} DIFFICULTY TEST WITH:
- ${mcqCount} multiple-choice questions (with options A, B, C, D)
- ${shortAnswerCount} short answer questions

IMPORTANT FORMATTING REQUIREMENTS:
1. Number each question sequentially (1, 2, 3, etc.)
2. For multiple-choice questions:
   - Display 4 options labeled A, B, C, D
   - Make sure exactly ONE option is correct
   - Include a variety of question types (recall, application, analysis)
3. For short answer questions:
   - Clearly mark with [Short Answer] after the question number
   - Keep questions focused and answerable in 2-3 sentences

4. After ALL questions, include an ANSWERS section with:
   - For MCQs: Question number and the correct letter (e.g., "1. A")
   - For short answers: Question number and a model answer

ENSURE:
- Questions are directly based on the PDF content
- Difficulty level is appropriate (${difficulty})
- Questions are clear, unambiguous, and test understanding
- Correct answers are clearly indicated in the ANSWERS section
- Both questions and answers follow the specified format exactly
`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    return response;
  } catch (error) {
    console.error("Error generating mock test:", error);
    throw new Error("Failed to generate mock test");
  }
}

/**
 * Prepares interview questions based on PDF content
 */
export async function prepareInterviewQuestions(pdfText: string, interviewType: string): Promise<string[]> {
  try {
    console.log("Preparing interview questions, type:", interviewType);
    const prompt = `
      Create 10 challenging ${interviewType} interview questions based on the following content.
      Focus on testing deep understanding and application of concepts from the provided document.
      Questions should be comprehensive and require detailed answers.
      
      For each question:
      - Make it open-ended and thoughtful
      - Ensure it tests real comprehension of the material
      - Frame it as if being asked in a professional interview setting
      
      Return ONLY the questions as a numbered list without additional text.
      
      Content:
      ${pdfText.slice(0, 50000)}
    `;
    
    const response = await runQuery(prompt, {
      temperature: 0.7,
      maxOutputTokens: 2000,
    });
    
    // Extract questions from response
    const questions = response
      .split('\n')
      .filter(line => line.trim())
      .map(line => line.replace(/^\d+\.\s*/, '').trim());
    
    return questions;
  } catch (error) {
    console.error("Error preparing interview questions:", error);
    toast.error("Failed to prepare interview questions");
    throw new Error("Interview preparation failed");
  }
}

/**
 * Evaluates interview responses
 */
export async function evaluateInterviewResponse(question: string, response: string, pdfText: string): Promise<string> {
  try {
    const prompt = `
      Evaluate the following interview response based on the provided content.
      
      Context from PDF:
      ${pdfText.slice(0, 20000)}
      
      Question: ${question}
      
      Response: ${response}
      
      Provide a thorough evaluation that includes:
      1. Overall quality of the answer (excellent, good, average, poor)
      2. Key strengths of the response
      3. Areas for improvement or missed points
      4. Suggestions for a better answer
      
      End with a score from 1-5 stars. Be fair but constructive.
    `;
    
    const aiEvaluation = await runQuery(prompt, {
      temperature: 0.3,
      maxOutputTokens: 1000,
    });
    
    return aiEvaluation;
  } catch (error) {
    console.error("Error evaluating interview response:", error);
    toast.error("Failed to evaluate your response");
    throw new Error("Interview evaluation failed");
  }
}

/**
 * Has the AI conduct an interview based on PDF content
 */
export async function conductAIInterview(pdfText: string, interviewType: string): Promise<string[]> {
  try {
    console.log("Setting up AI interview, type:", interviewType);
    const prompt = `
      Create a structured ${interviewType} interview script based on the following content.
      The interview should consist of 5 rounds:
      
      1. Introduction - A short welcome and explanation of the interview process
      2. 5 technical questions directly related to the content that test knowledge
      3. 2 application questions that test how the person would apply the concepts
      4. 1 challenge question that tests deeper understanding
      5. Conclusion - A polite ending to the interview
      
      Format each part with clear headings and return as a complete interview script.
      
      Content:
      ${pdfText.slice(0, 40000)}
    `;
    
    const response = await runQuery(prompt, {
      temperature: 0.7,
      maxOutputTokens: 4000,
    });
    
    // Split the response into sections
    const sections = response.split(/\n#{1,2}\s+/i);
    return sections.filter(s => s.trim().length > 0);
  } catch (error) {
    console.error("Error preparing AI interview:", error);
    toast.error("Failed to prepare AI interview");
    throw new Error("AI interview preparation failed");
  }
}

/**
 * Generates the next interview question based on previous answers
 */
export async function getNextInterviewQuestion(
  pdfContent: string, 
  previousQuestions: string[], 
  previousAnswers: string[],
  interviewProgress: number
): Promise<string> {
  try {
    console.log("Generating next interview question, progress:", interviewProgress);
    
    // Prepare context with previous Q&A
    let context = "Previous questions and answers:\n";
    for (let i = 0; i < previousQuestions.length; i++) {
      context += `Q: ${previousQuestions[i]}\n`;
      if (i < previousAnswers.length) {
        context += `A: ${previousAnswers[i]}\n\n`;
      }
    }
    
    // Determine question type based on progress
    let questionType = "basic knowledge";
    if (interviewProgress > 0.3 && interviewProgress < 0.7) {
      questionType = "application of concepts";
    } else if (interviewProgress >= 0.7) {
      questionType = "challenging conceptual";
    }
    
    const prompt = `
      You are conducting a professional interview based on this PDF content.
      Generate the next interview question based on previous interactions and current progress.
      
      PDF Content: 
      ${pdfContent.slice(0, 20000)}
      
      ${context}
      
      Current interview progress: ${Math.round(interviewProgress * 100)}%
      Question type needed: ${questionType}
      
      Generate only ONE question that:
      - Is directly related to the PDF content
      - Builds on previous questions where appropriate
      - Is appropriate for the current stage of the interview
      - Requires a thoughtful response
      
      Return ONLY the question text with no additional context or explanations.
    `;
    
    const response = await runQuery(prompt, {
      temperature: 0.6,
      maxOutputTokens: 300,
    });
    
    return response.trim();
  } catch (error) {
    console.error("Error generating next interview question:", error);
    toast.error("Failed to generate next question");
    throw new Error("Interview question generation failed");
  }
}

/**
 * Automatically generates a response to be used in a mock interview
 * where the AI is role-playing as the candidate
 */
export async function generateMockInterviewResponse(question: string, pdfContent: string): Promise<string> {
  try {
    console.log("Generating mock interview response for:", question);
    
    const prompt = `
      You are a job candidate being interviewed. Answer the following interview question 
      based on the provided resume/CV content. The response should sound natural and conversational,
      as if a real person is speaking in an interview.
      
      Resume/CV Content:
      ${pdfContent.slice(0, 20000)}
      
      Interview Question: ${question}
      
      Respond as the candidate would in a real interview, highlighting relevant experiences and skills
      from the resume while keeping a conversational tone. The answer should be 3-5 sentences long.
      
      Include minor verbal hesitations or filler words occasionally to make it sound more natural.
    `;
    
    const response = await runQuery(prompt, {
      temperature: 0.8, // Higher temperature for more natural responses
      maxOutputTokens: 500,
    });
    
    return response.trim();
  } catch (error) {
    console.error("Error generating mock interview response:", error);
    return "I'm sorry, I'm having trouble coming up with a response at the moment.";
  }
}
