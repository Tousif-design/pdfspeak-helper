
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
      Analyze the following PDF content and provide:
      1. A concise 3-paragraph summary of the main topics
      2. 5 key insights or takeaways
      3. Any important terms or concepts mentioned
      
      PDF Content:
      ${truncatedText}
    `;
    
    const response = await runQuery(prompt, {
      temperature: 0.2,
      maxOutputTokens: 2000,
    });
    
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
      Use the following PDF content to answer the question. 
      If the answer is not in the content, say "I don't have enough information to answer that question based on the provided PDF."
      
      PDF Content:
      ${truncatedText}
      
      Question: ${question}
    `;
    
    const response = await runQuery(prompt, {
      temperature: 0.2,
      maxOutputTokens: 2000,
    });
    
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
export async function generateMockTest(pdfText: string, testType: string, numQuestions: number): Promise<string> {
  try {
    const prompt = `
      Create a ${testType} mock test with ${numQuestions} questions based on the following content.
      Include a mix of multiple choice, short answer, and essay questions.
      Format it beautifully with clear instructions, sections, and an answer key at the end.
      
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
    const prompt = `
      Create 10 challenging ${interviewType} interview questions based on the following content.
      Focus on testing deep understanding and application of concepts.
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
      Provide constructive feedback and a score from 1-5 stars.
      
      Context from PDF:
      ${pdfText.slice(0, 20000)}
      
      Question: ${question}
      
      Response: ${response}
      
      Evaluation:
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
