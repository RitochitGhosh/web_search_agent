import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { RunnableLambda } from "@langchain/core/runnables";

import { candidate } from "./types";
import { getChatModel } from "../shared/models";



export const directPath = RunnableLambda.from(
    async (input: { q: string; mode: 'web' | 'direct' }): Promise<candidate> => {
        const model = getChatModel({ temperature: 0.2 });
        const directAnswerFromModel = await model.invoke([
            new SystemMessage(
                [
                    "Give clear and correct, brief answer.",
                    "If unsure, say so."
                ].join("\n")
            ),
            new HumanMessage(input.q)
        ]);

        const directAnswer = (
            typeof directAnswerFromModel.content === 'string' ?
                directAnswerFromModel.content : String(directAnswerFromModel.content)
        ).trim();

        return {
            answer: directAnswer,
            sources: [],
            mode: 'direct'
        };
    }
)