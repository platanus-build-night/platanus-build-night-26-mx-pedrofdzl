"use client";

import { createContext, useContext, useState } from "react";

type CopilotState = {
  open: boolean;
  setOpen: (value: boolean) => void;
  toggle: () => void;
};

const CopilotContext = createContext<CopilotState | null>(null);

export function CopilotProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <CopilotContext.Provider value={{ open, setOpen, toggle: () => setOpen((value) => !value) }}>
      {children}
    </CopilotContext.Provider>
  );
}

export function useCopilot() {
  const ctx = useContext(CopilotContext);
  if (!ctx) throw new Error("useCopilot must be used within CopilotProvider");
  return ctx;
}
