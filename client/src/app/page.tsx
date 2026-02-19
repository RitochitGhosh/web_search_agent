"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Loader2, Send } from "lucide-react";


import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { API_URL } from "@/lib/config";

type SearchResponse = {
  answer: string;
  sources: string[];
};

type CurrentChatTurn =
  | {
      role: "user";
      content: string;
    }
  | {
      role: "assistant";
      content: string;
      sources: string[];
      time: number;
      error?: string;
    };

export default function Home() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [chat, setChat] = useState<CurrentChatTurn[]>([]);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [chat]);

  async function runSearch(prompt: string) {
    setLoading(true);
    setChat((old) => [...old, { role: "user", content: prompt }]);
    const oldTime = performance.now();

    try {
      const res = await fetch(`${API_URL}/search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ q: prompt }),
      });
      const json = await res.json();
      const timeDiff = Math.round(performance.now() - oldTime);
      // error handling

      if (!res.ok) {
        const errorMsg = "Request failed";
        setChat((old) => [
          ...old,
          {
            role: "assistant",
            content:
              "I tried to ans, but something went wrong. Please try again",
            sources: [],
            time: timeDiff,
            error: errorMsg,
          },
        ]);
        //success
      } else {
        const data = json as SearchResponse;
        setChat((old) => [
          ...old,
          {
            role: "assistant",
            content: data.answer,
            sources: data.sources,
            time: timeDiff,
          },
        ]);
      }
    } catch (e) {
      const timeDiff = Math.round(performance.now() - oldTime);
      const errorMsg = "Request failed";
      setChat((old) => [
        ...old,
        {
          role: "assistant",
          content: "I tried to ans, but something went wrong. Please try again",
          sources: [],
          time: timeDiff,
          error: errorMsg,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function handleChatSubmit(e: FormEvent) {
    e.preventDefault();
    const prompt = query.trim();
    if (!prompt || loading) return;
    setQuery("");
    await runSearch(prompt);
  }

  return (
  <div className="flex min-h-dvh flex-col bg-neutral-50 text-black">
    {/* Header */}
    <header className="border-b-4 border-black bg-white px-6 py-4">
      <h1 className="text-xl font-bold tracking-tight">AskAnything</h1>
    </header>

    {/* Chat */}
    <main
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-4 py-6 space-y-6"
    >
      {chat.length === 0 && (
        <div className="mx-auto max-w-2xl border-2 border-black bg-white p-6 text-center">
          <div className="text-lg font-semibold mb-2">Ask anything</div>
          <div className="text-sm text-neutral-600 leading-relaxed">
            Examples:
            <div className="mt-3 space-y-2">
              <div className="border border-black bg-neutral-100 px-3 py-2 text-xs">
                Top 10 engineering colleges in India 2025
              </div>
              <div className="border border-black bg-neutral-100 px-3 py-2 text-xs">
                Explain what Docker is for beginners
              </div>
            </div>
          </div>
        </div>
      )}

      {chat.map((turn, idx) => {
        if (turn.role === "user") {
          return (
            <div key={idx} className="mx-auto max-w-2xl flex justify-end">
              <div className="max-w-[80%] border-2 border-black bg-black px-4 py-3 text-sm text-white">
                {turn.content}
              </div>
            </div>
          );
        }

        return (
          <div
            key={idx}
            className="mx-auto max-w-2xl flex items-start gap-3"
          >
            <div className="flex h-8 w-8 flex-none items-center justify-center border-2 border-black bg-black text-xs font-bold text-white">
              AI
            </div>

            <div className="flex-1 space-y-3">
              <div className="border-2 border-black bg-white px-4 py-3 text-sm whitespace-pre-wrap">
                {turn.content}
              </div>

              <div className="text-xs text-neutral-600 flex gap-3">
                {typeof turn.time === "number" && (
                  <span>{turn.time} ms</span>
                )}
                {turn.error && <span>{turn.error}</span>}
              </div>

              {turn.sources?.length > 0 && (
                <div className="border-2 border-black bg-white px-3 py-2 text-xs">
                  <div className="font-semibold mb-1">Sources</div>
                  <ul className="space-y-1">
                    {turn.sources.map((src, i) => (
                      <li key={i} className="break-all underline">
                        <Link href={src} target="_blank">
                          {src}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Loader */}
      {loading && (
        <div className="mx-auto max-w-2xl flex items-start gap-3">
          <div className="flex h-8 w-8 items-center justify-center border-2 border-black bg-black text-white">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
          <div className="border-2 border-black bg-white px-4 py-3 text-sm">
            Thinking…
          </div>
        </div>
      )}
    </main>

    {/* Input */}
    <footer className="border-t-4 border-black bg-white px-4 py-4">
      <form
        onSubmit={handleChatSubmit}
        className="mx-auto flex max-w-2xl gap-2"
      >
        <Input
          className="border-2 border-black rounded-none"
          placeholder="Ask anything…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={loading}
        />
        <Button
          type="submit"
          disabled={loading || query.trim().length < 5}
          className="border-2 border-black rounded-none bg-black text-white hover:bg-black"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send />}
        </Button>
      </form>
    </footer>
  </div>
);

}