// Web PATH -> Browse, Summarize, source urs/cite urls.
// Direct PATTH -> LLM

export type candidate = {
    answer: string;
    sources: string[];
    mode: "web" | "direct";
};

