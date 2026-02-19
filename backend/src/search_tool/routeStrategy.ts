import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { RunnableLambda } from "@langchain/core/runnables";

import { getChatModel } from "../shared/models";
import { SearchInputSchema } from "../utils/schemas";

export function heuristicRoute(q: string): "web" | "direct" | "unsure" {
  const trimmed = q.toLowerCase().trim();

  if (trimmed.length > 70) return "web";
  if (/\b20(2[4-9]|3[0-9])\b/u.test(trimmed)) return "web";

  const patterns: RegExp[] = [
    /\btop[-\s]*\d+\b/u,
    /\bbest\b/u,
    /\brank(?:ing|ings)?\b/u,
    /\bwhich\s+is\s+better\b/u,
    /\b(?:vs\.?|versus)\b/u,
    /\bcompare|comparison\b/u,

    /\bprice|cost|cheapest|pricing\b/u,
    /\blatest|today|current|now\b/u,
    /\bnews|breaking|trending\b/u,
    /\breleased?|launched?|updated?\b/u,

    /\bnear\s+me|nearby\b/u,
    /\bhappening\b/u,
  ];

  if (patterns.some((p) => p.test(trimmed))) {
    return "web";
  }

  // Not confident either way
  return "unsure";
}


async function llmRoute(q: string): Promise<"web" | "direct"> {
  const model = getChatModel({ temperature: 0 });

  const res = await model.invoke([
    new SystemMessage(
      [
        "You are a routing classifier for a search system.",
        "Decide whether the question requires live or recent web information.",
        "",
        "Return ONLY one word:",
        "- web → if up-to-date, rankings, news, prices, comparisons, or real-world info is needed",
        "- direct → if it can be answered from general knowledge",
        "",
        "No explanations. No punctuation."
      ].join("\n")
    ),
    new HumanMessage(q),
  ]);

  const output =
    typeof res.content === "string"
      ? res.content.trim().toLowerCase()
      : "";

  return output === "web" ? "web" : "direct";
}


export const routerStep = RunnableLambda.from(
  async (input: { q: string }) => {
    const { q } = SearchInputSchema.parse(input);

    // 1️⃣ heuristic pass
    const heuristicDecision = heuristicRoute(q);

    if (heuristicDecision !== "unsure") {
      return { q, mode: heuristicDecision };
    }

    // 2️⃣ LLM fallback (only when unsure)
    const llmDecision = await llmRoute(q);

    return {
      q,
      mode: llmDecision,
    };
  }
);