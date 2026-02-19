import { HumanMessage, SystemMessage } from "@langchain/core/messages";

import { getChatModel } from "../shared/models";
import { SummarizeInputSchema, SummarizeOutputSchema } from "./schemas"


export async function summarize(text: string) {
    const { text: raw } = SummarizeInputSchema.parse(text);

    const clipped = clip(raw, 2000);

    const model = getChatModel({ temperature: 0.2 });

    // ask the model to summarize in a controlled manner
    const res = await model.invoke([
        new SystemMessage([
            "You are a helpful assistant that writes, short, accurate summaries.",
            "Guidelines:",
            "- Be factual and neutral, avoid marketing language.",
            "- 5-8 sentences; no lists unless absolutely necessity.",
            "- Do NOT invent sources; ONLY summarize the provided text.",
            "- Keep it readable for beginners."
        ].join("\n")),
        new HumanMessage([
            "Summarize the following content in a simple language:",
            "Focus on key facts and remove extra unnecessary stuffs.",
            "TEXT:",
            clipped
        ].join("\n"))
    ]);

    const rawModelOutput = typeof res.content === "string" ? res.content : String(res.content);

    const summary = normalizeSummary(rawModelOutput);

    return SummarizeOutputSchema.parse({ summary });
}

function clip(text: string, limit: number) {
    return text.length > limit ? text.slice(0, limit) : text;
}

function normalizeSummary(s: string) {
    const t = s
        .replace(/\s+\n/g, "\n")
        .replace(/\n{3,}}/g, "\n\n")
        .trim();

    return t.slice(0, 2500);
}