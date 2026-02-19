import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { RunnableLambda, RunnableSequence } from "@langchain/core/runnables";

import { webSearch } from "../utils/webSearch";
import { openUrl } from "../utils/openUrl";
import { summarize } from "../utils/summarize";
import { candidate } from "./types";
import { getChatModel } from "../shared/models";

const setTopResults = 5;

export const webSearchStep = RunnableLambda.from(
    async (ctx: { q: string; mode: "web" | "direct" }) => {
        const results = await webSearch(ctx.q);

        return {
            ...ctx,
            results,
        };
    }
);

export const openAndSummarizeStep = RunnableLambda.from(
    async (ctx: { q: string; mode: "web" | "direct"; results: any[] }) => {
        if (!Array.isArray(ctx.results) || ctx.results.length == 0) {
            return {
                ...ctx,
                pageSummaries: [],
                fallback: 'no-results' as const
            }
        }

        const extractTopResults = ctx.results.slice(0, setTopResults);

        const settledResults = await Promise.allSettled(
            extractTopResults.map(async (result: any) => {
                const opened = await openUrl(result.url);
                const { summary } = await summarize(opened.content);

                return {
                    url: opened.url,
                    summary: summary
                }

            })
        );

        // status -> fulfilled
        const settledResultsPageeSummaries = settledResults.filter(
            settledResult => settledResult.status === 'fulfilled'
        );

        // edge case: allsettled every case fails

        if (settledResultsPageeSummaries.length === 0) {
            const fallbackSnippetSummaries = extractTopResults.map((result: any) => ({
                url: result.url,
                summary: String(result.snippet || result.title || "").trim()
            })).filter((x: any) => x.summary.length > 0)

            return {
                ...ctx,
                pageSummaries: fallbackSnippetSummaries,
                fallback: 'snippets' as const

            }
        }

        return {
            ...ctx,
            pageSummaries: settledResultsPageeSummaries,
            fallback: 'none' as const
        }
    }
);

export const composeStep = RunnableLambda.from(
    async (input: {
        q: string;
        pageSummaries: Array<{ url: string; summary: string }>;
        mode: 'web' | 'direct';
        fallback: 'no-results' | 'snippets' | 'none';
    }): Promise<candidate> => {
        const model = getChatModel({ temperature: 0.2 });

        if (!input.pageSummaries || input.pageSummaries.length === 0) {
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

        const webAnswerFromModel = await model.invoke([
            new SystemMessage(
                [
                    "Concisely answer questions using provided page summaries",
                    "Rules:",
                    "- Be acurate and neutral",
                    "- 5 - 8 sentences at max(if possible)",
                    "- Use only the provided summaries; do not invent new facts"
                ].join("\n")
            ),
            new HumanMessage(
                [
                    `Question: ${input.q}`,
                    "Summaries:",
                    JSON.stringify(input.pageSummaries, null, 2)
                ].join("\n")
            )
        ]);

        const webAnswer = typeof webAnswerFromModel.content === 'string' ?
            webAnswerFromModel.content : String(webAnswerFromModel.content);

        const extractSources = input.pageSummaries.map(summary => summary.url);

        return {
            answer: webAnswer,
            sources: extractSources,
            mode: 'web',
        }
    }
);

// LCEL
// webSearchStep
// openAndSummarizeStep
// composeStep
export const webPath = RunnableSequence.from(
    [
        webSearchStep, openAndSummarizeStep, composeStep
    ]
);