"use client";

import { createContext, useContext, useState } from "react";

type AnalysisState = {
  jobs: number[];
  track: (id: number) => void;
  untrack: (id: number) => void;
};

const AnalysisContext = createContext<AnalysisState | null>(null);

export function AnalysisProvider({ children }: { children: React.ReactNode }) {
  const [jobs, setJobs] = useState<number[]>([]);
  const track = (id: number) => setJobs((prev) => (prev.includes(id) ? prev : [...prev, id]));
  const untrack = (id: number) => setJobs((prev) => prev.filter((value) => value !== id));
  return (
    <AnalysisContext.Provider value={{ jobs, track, untrack }}>{children}</AnalysisContext.Provider>
  );
}

export function useAnalysis() {
  const ctx = useContext(AnalysisContext);
  if (!ctx) throw new Error("useAnalysis must be used within AnalysisProvider");
  return ctx;
}
