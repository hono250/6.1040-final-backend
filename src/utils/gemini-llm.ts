import { GoogleGenAI, HarmBlockThreshold, HarmCategory } from "npm:@google/genai";

/**
 * Configuration for API access
 */
export interface Config {
    apiKey: string;
}

export class GeminiLLM {
    private apiKey: string;

    constructor(config: Config) {
        this.apiKey = config.apiKey;
    }

    async executeLLM (prompt: string): Promise<string> {
        try {
            // Initialize Gemini AI
            const genAI = new GoogleGenAI({ apiKey: this.apiKey });
            
            // Execute the LLM
            const result = await genAI.models.generateContent({
                model: "gemini-2.5-flash",
                contents: prompt,
                config: {
                    maxOutputTokens: 5000,
                    tools: [{urlContext: {}}],
                    safetySettings: [
                        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE }
                    ]
                }
            });
            
            const text = result.text;

            if (text === undefined) {
                throw new Error('No text returned from Gemini API');
            }
            return text;            
        } catch (error) {
            console.error('❌ Error calling Gemini API:', (error as Error).message);
            throw error;
        }    }
}
