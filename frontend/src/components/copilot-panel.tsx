"use client";

import { useEffect, useRef, useState } from "react";
import { SendHorizonal, Wrench, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { streamChat, type ChatMessage } from "@/lib/copilot";
import { useCopilot } from "@/lib/copilot-ui";
import { cn } from "@/lib/utils";

type ToolCall = { name: string; input: Record<string, unknown> };
type Turn = ChatMessage & { tools?: ToolCall[] };

const SUGGESTIONS = [
  "Do we encrypt customer data at rest?",
  "What certifications do we hold?",
  "Is MFA enforced for admins?",
];

export function CopilotPanel() {
  const { open, setOpen } = useCopilot();
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

  if (!open) return null;

  return (
    <aside className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-border bg-card shadow-xl">
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
        <span className="text-sm font-medium tracking-tight">Compliance Copilot</span>
        <Button variant="ghost" size="icon" aria-label="Close copilot" onClick={() => setOpen(false)}>
          <X className="size-4" />
        </Button>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {turns.length === 0 ? (
          <div className="space-y-3 text-sm text-muted-foreground">
            <p>Ask about your security posture. Answers are grounded in your verified fact base.</p>
            <div className="flex flex-col items-start gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => send(suggestion)}
                  className="rounded-md border border-border px-2.5 py-1 text-xs text-foreground hover:bg-accent"
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
                  "max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap",
                  turn.role === "user"
                    ? "bg-primary text-primary-foreground"
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
        className="flex shrink-0 items-center gap-2 border-t border-border p-3"
      >
        <Input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Ask the copilot..."
          disabled={streaming}
        />
        <Button type="submit" size="icon" disabled={streaming || !input.trim()}>
          <SendHorizonal className="size-4" />
        </Button>
      </form>
    </aside>
  );
}
