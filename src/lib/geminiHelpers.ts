
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
  try {
    console.log("Analyzing PDF content, length:", pdfText.length);
    if (!pdfText || pdfText.trim().length === 0) {
      console.error("PDF text is empty");
      throw new Error("PDF content is empty");
    }

    // Limit PDF text to prevent token limit issues
    const truncatedText = pdfText.slice(0, 25000);
    
    const prompt = `
      Analyze the following PDF content and provide a structured response with:
      1. A concise 3-paragraph summary of the main topics
      2. 5 key insights or takeaways
      3. Any important terms or concepts mentioned with brief definitions
      4. Potential questions someone might have about this content
      
      Format your response clearly with headings. Be direct and informative.
      
      PDF Content:
      ${truncatedText}
    `;
    
    const response = await runQuery(prompt, {
      temperature: 0.2,
      maxOutputTokens: 3000,
    });
    
    console.log("PDF analysis complete, response length:", response.length);
    return response;
  } catch (error) {
    console.error("Error analyzing PDF:", error);
    toast.error("PDF Analysis Error", { description: "Failed to analyze the PDF content" });
    throw new Error("PDF analysis failed");
  }
}

/**
 * Answers questions based on PDF content
 */
export async function answerQuestionFromPdf(question: string, pdfText: string): Promise<string> {
  try {
    console.log("Answering question from PDF:", question);
    
    // Limit PDF text to prevent token limit issues
    const truncatedText = pdfText.slice(0, 25000);
    
    const prompt = `
      Using the following PDF content as context, answer this question thoroughly and directly:
      
      PDF Content:
      ${truncatedText}
      
      Question: ${question}
      
      If the answer isn't in the content, clearly state: "I don't have enough information to answer that question based on the provided PDF."
      
      Respond in a clear, informative manner with examples from the PDF where relevant.
      Be helpful and provide a complete answer based on the context.
    `;
    
    const response = await runQuery(prompt, {
      temperature: 0.3,
      maxOutputTokens: 2000,
    });
    
    console.log("Question answered, response length:", response.length);
    return response;
  } catch (error) {
    console.error("Error answering question:", error);
    toast.error("Failed to answer", { description: "Unable to process your question" });
    throw new Error("Question answering failed");
  }
}

/**
 * Generates a mock test based on PDF content
 */
export async function generateMockTest(pdfText: string, testType: string, numQuestions: number, questionFormat: string = "mixed"): Promise<string> {
  try {
    console.log("Generating mock test, content length:", pdfText.length, "test type:", testType, "format:", questionFormat);
    
    let formatInstructions = "";
    if (questionFormat === "mcq") {
      formatInstructions = "Include ONLY multiple choice questions with options labeled A, B, C, D.";
    } else if (questionFormat === "short_answer") {
      formatInstructions = "Include ONLY short answer questions that require written responses.";
    } else {
      formatInstructions = "Include a mix of multiple choice questions with options labeled A, B, C, D and short answer questions.";
    }
    
    const prompt = `
      Create a ${testType} mock test with exactly ${numQuestions} questions based on the following content.
      ${formatInstructions}
      
      Format the test as follows:
      1. Start with a clear title
      2. Include clear instructions
      3. Number each question
      4. For multiple choice, format as "A. option", "B. option", etc.
      5. End with an ANSWERS section that lists the correct answers (letter for multiple choice, short text for others)
      
      VERY IMPORTANT: Make the test comprehensive and challenging, but ensure ALL questions directly relate to the provided content.
      Make sure each question can be answered based on the provided content only.
      
      Content:
      ${pdfText.slice(0, 50000)}
    `;
    
    const response = await runQuery(prompt, {
      temperature: 0.7,
      maxOutputTokens: 8000,
    });
    
    return response;
  } catch (error) {
    console.error("Error generating mock test:", error);
    toast.error("Failed to generate mock test");
    throw new Error("Mock test generation failed");
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
