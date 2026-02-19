import { ChatOpenAI } from "@langchain/openai";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { ChatGroq } from "@langchain/groq";
import { ChatMistralAI } from "@langchain/mistralai";

import type { BaseChatModel } from '@langchain/core/language_models/chat_models';

import { env } from './env';


type ModelOpts = {
    temperature?: number;
    maxTokens?: number;
}

export function getChatModel(opts: ModelOpts = {}): BaseChatModel {
    const temp = opts?.temperature ?? 0.2;


    switch (env.MODEL_PROVIDER) {
        case 'gemini':
            return new ChatGoogleGenerativeAI({
                apiKey: env.GEMINI_API_KEY,
                model: env.GEMINI_MODEL,
                temperature: temp
            });

        case 'openai':
            return new ChatOpenAI({
                apiKey: env.OPENAI_API_KEY,
                model: env.OPENAI_MODEL,
                temperature: temp
            });

        case 'groq':
            return new ChatGroq({
                apiKey: env.GROQ_API_KEY,
                model: env.GROQ_MODEL,
                temperature: temp
            });

        case 'mistral':
            return new ChatMistralAI({
                apiKey: env.MISTRAL_API_KEY,
                model: env.MISTRAL_MODEL,
                temperature: temp
            });

        default:
            return new ChatGoogleGenerativeAI({
                apiKey: env.GEMINI_API_KEY,
                model: env.GEMINI_MODEL,
                temperature: temp
            });
    }
}


