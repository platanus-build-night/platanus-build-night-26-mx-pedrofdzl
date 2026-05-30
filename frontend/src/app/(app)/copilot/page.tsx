"use client";

import { useEffect, useRef, useState } from "react";
import { SendHorizonal, Wrench } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { streamChat, type ChatMessage } from "@/lib/copilot";
import { cn } from "@/lib/utils";

type ToolCall = { name: string; input: Record<string, unknown> };
type Turn = ChatMessage & { tools?: ToolCall[] };

const SUGGESTIONS = [
  "Do we encrypt customer data at rest?",
  "What certifications do we hold?",
  "Is MFA enforced for admins?",
];

export default function CopilotPage() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [turns]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || streaming) return;
    const history: ChatMessage[] = [
      ...turns.map((turn) => ({ role: turn.role, content: turn.content })),
      { role: "user", content },
    ];
    setTurns((prev) => [
      ...prev,
      { role: "user", content },
      { role: "assistant", content: "", tools: [] },
    ]);
    setInput("");
    setStreaming(true);
    try {
      await streamChat(history, (event) => {
        setTurns((prev) => {
          const next = prev.slice();
          const i = next.length - 1;
          const last = next[i];
          if (event.type === "text") {
            next[i] = { ...last, content: last.content + event.text };
          } else if (event.type === "tool") {
            next[i] = {
              ...last,
              tools: [...(last.tools ?? []), { name: event.name, input: event.input }],
            };
          }
          return next;
        });
      });
    } catch (error) {
      setTurns((prev) => {
        const next = prev.slice();
        const i = next.length - 1;
        next[i] = { ...next[i], content: `Error: ${(error as Error).message}` };
        return next;
      });
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] flex-col">
      <h1 className="mb-4 text-xl font-semibold tracking-tight">Compliance Copilot</h1>
      <div className="flex flex-1 flex-col overflow-hidden border border-border bg-card">
        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
          {turns.length === 0 ? (
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                Ask about your security posture. Answers are grounded in your verified fact base.
              </p>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => send(suggestion)}
                    className="border border-border px-2.5 py-1 text-xs text-foreground hover:bg-accent"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            turns.map((turn, index) => (
              <div
                key={index}
                className={cn("flex", turn.role === "user" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[80%] px-3 py-2 text-sm whitespace-pre-wrap",
                    turn.role === "user"
                      ? "bg-brand text-white"
                      : "border border-border bg-background",
                  )}
                >
                  {turn.tools?.map((tool, toolIndex) => (
                    <div
                      key={toolIndex}
                      className="mb-1.5 flex items-center gap-1.5 text-xs text-muted-foreground"
                    >
                      <Wrench className="size-3" />
                      <span className="font-mono">{tool.name}</span>
                    </div>
                  ))}
                  {turn.content || (turn.role === "assistant" && streaming ? "..." : "")}
                </div>
              </div>
            ))
          )}
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            send(input);
          }}
          className="flex items-center gap-2 border-t border-border p-3"
        >
          <Input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Ask the copilot..."
            disabled={streaming}
          />
          <Button type="submit" size="sm" disabled={streaming || !input.trim()}>
            <SendHorizonal className="size-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
