"use client";

import { useRef, useState } from "react";
import { File, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface FileUploadProps {
  accept?: string;
  value: File | null;
  onChange: (file: File | null) => void;
  disabled?: boolean;
  hint?: string;
}

export function FileUpload({ accept, value, onChange, disabled, hint }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = (files: FileList | null) => {
    const file = files?.[0] ?? null;
    onChange(file);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setDragging(true);
  };

  const onDragLeave = () => setDragging(false);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (!disabled) handleFiles(e.dataTransfer.files);
  };

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-card px-3.5 py-2.5">
        <File className="size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px]">{value.name}</p>
          <p className="text-[11px] text-muted-foreground">{formatBytes(value.size)}</p>
        </div>
        <button
          type="button"
          onClick={clear}
          disabled={disabled}
          className="shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground disabled:pointer-events-none"
          aria-label="Remove file"
        >
          <X className="size-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      onClick={() => !disabled && inputRef.current?.click()}
      onKeyDown={(e) => e.key === "Enter" && !disabled && inputRef.current?.click()}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        "flex cursor-pointer flex-col items-center gap-1.5 rounded-lg border border-dashed border-border px-4 py-5 text-center transition-colors",
        dragging && "border-foreground/30 bg-accent/40",
        !dragging && !disabled && "hover:border-foreground/20 hover:bg-accent/20",
        disabled && "cursor-not-allowed opacity-50",
      )}
    >
      <Upload className="size-4 text-muted-foreground" />
      <div>
        <p className="text-[13px] text-foreground">Click to browse or drag and drop</p>
        {hint && <p className="mt-0.5 text-[11.5px] text-muted-foreground">{hint}</p>}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        disabled={disabled}
        className="sr-only"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  );
}
