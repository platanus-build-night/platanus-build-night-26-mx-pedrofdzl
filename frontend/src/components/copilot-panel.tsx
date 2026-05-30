"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Wrench, X } from "lucide-react";

import { Button } from "@/components/ui/button";
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [turns]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [input]);

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

  const onCardMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    const t = e.target as HTMLElement;
    if (t.tagName === "TEXTAREA" || t.closest("button")) return;
    e.preventDefault();
    textareaRef.current?.focus();
  };

  return (
    <div
      aria-hidden={!open}
      className={cn(
        "shrink-0 overflow-hidden transition-[width] duration-200 ease-out",
        open ? "w-96" : "pointer-events-none w-0",
      )}
    >
      <aside
        className={cn(
          "flex h-full w-96 flex-col",
          "transition-[transform,opacity] duration-200 ease-out",
          open ? "translate-x-0 opacity-100" : "translate-x-4 opacity-0",
        )}
      >
        {/* Header */}
        <header className="flex h-12 shrink-0 items-center gap-1 px-2">
          <Button
            variant="tertiary"
            size="icon-sm"
            aria-label="Close chat"
            onClick={() => setOpen(false)}
          >
            <X />
          </Button>
          <span className="ml-1 text-[15px] font-semibold tracking-tight">Chat with Ditto</span>
        </header>

        {/* Thread */}
        <div
          ref={scrollRef}
          className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-3 pt-6 pb-10 [mask-image:linear-gradient(to_bottom,transparent_0,black_22px,black_calc(100%-22px),transparent_100%)]"
        >
          {turns.length === 0 ? (
            <div className="space-y-4">
              <p className="text-[13px] text-muted-foreground">
                Ask about your security posture. Answers are grounded in your verified fact base.
              </p>
              <div className="flex flex-col items-start gap-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => send(suggestion)}
                    className="rounded-md border border-border bg-card px-3 py-1.5 text-left text-[13px] text-foreground shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition-colors hover:bg-accent"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {turns.map((turn, index) => (
                <div
                  key={index}
                  className={cn(
                    "animate-in fade-in duration-200",
                    turn.role === "user" ? "flex justify-end" : "space-y-1",
                  )}
                >
                  {turn.role === "user" ? (
                    <div className="max-w-[88%] rounded-lg border border-border bg-card px-3.5 py-2 text-[13px] leading-relaxed whitespace-pre-wrap shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                      {turn.content}
                    </div>
                  ) : (
                    <>
                      {turn.tools?.map((tool, toolIndex) => (
                        <div
                          key={toolIndex}
                          className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
                        >
                          <Wrench className="size-3 shrink-0" />
                          <span className="font-mono">{tool.name}</span>
                        </div>
                      ))}
                      {(turn.content || streaming) && (
                        <p className="text-[13px] leading-[1.55] text-foreground/90 whitespace-pre-wrap">
                          {turn.content || (streaming ? "..." : "")}
                        </p>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Input */}
        <div className="pt-1 pb-0">
          <div
            onMouseDown={onCardMouseDown}
            className="flex cursor-text flex-col gap-2 rounded-lg border border-border bg-card p-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)]"
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (!streaming) void send(input);
                }
              }}
              rows={2}
              placeholder="Ask Ditto..."
              disabled={streaming}
              className="min-h-[44px] w-full resize-none bg-transparent text-[13.5px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground"
            />
            <div className="flex items-center justify-end">
              <Button
                type="button"
                size="icon"
                disabled={streaming || !input.trim()}
                onClick={() => send(input)}
                aria-label="Send"
              >
                <ArrowUp />
              </Button>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
