"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Folder, FolderPlus } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Window } from "@/components/window";
import { useAnalysis } from "@/lib/analysis-ui";
import {
  analyzeDocument,
  createCategory,
  createTextDocument,
  listCategories,
  listDocuments,
  uploadDocument,
  type Category,
} from "@/lib/resources";
import { cn } from "@/lib/utils";

function depthOf(category: Category, byId: Map<number, Category>) {
  let depth = 0;
  let parent = category.parent;
  while (parent != null) {
    depth += 1;
    parent = byId.get(parent)?.parent ?? null;
  }
  return depth;
}

export default function DocumentsPage() {
  const queryClient = useQueryClient();
  const { track } = useAnalysis();
  const [selected, setSelected] = useState<number | null>(null);
  const [folderName, setFolderName] = useState("");
  const [uploadName, setUploadName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const categories = useQuery({ queryKey: ["categories"], queryFn: listCategories });
  const documents = useQuery({
    queryKey: ["documents", selected],
    queryFn: () => listDocuments(selected != null ? { category: selected } : undefined),
  });

  const byId = new Map((categories.data?.results ?? []).map((c) => [c.id, c]));

  const newFolder = useMutation({
    mutationFn: () => createCategory({ name: folderName, parent: selected }),
    onSuccess: () => {
      setFolderName("");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const upload = useMutation({
    mutationFn: async () => {
      const file = fileRef.current?.files?.[0];
      if (!file) throw new Error("Choose a file first.");
      const name = uploadName || file.name;
      if (file.name.toLowerCase().endsWith(".docx")) {
        const form = new FormData();
        form.append("name", name);
        form.append("doc_type", "docx");
        if (selected != null) form.append("category", String(selected));
        form.append("source_file", file);
        return uploadDocument(form);
      }
      const content = await file.text();
      return createTextDocument({ name, content, category: selected });
    },
    onSuccess: () => {
      toast.success("Document uploaded.");
      setUploadName("");
      if (fileRef.current) fileRef.current.value = "";
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const analyze = useMutation({
    mutationFn: (id: number) => analyzeDocument(id),
    onSuccess: (job) => track(job.id),
    onError: (error) => toast.error((error as Error).message),
  });

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
      <Window title="Folders">
        <div className="space-y-0.5">
          <button
            onClick={() => setSelected(null)}
            className={cn(
              "flex w-full items-center gap-2 rounded-md px-2 py-1 text-sm",
              selected === null ? "bg-accent" : "hover:bg-accent/50",
            )}
          >
            <Folder className="size-4 text-muted-foreground" />
            All documents
          </button>
          {(categories.data?.results ?? []).map((category) => (
            <button
              key={category.id}
              onClick={() => setSelected(category.id)}
              style={{ paddingLeft: 8 + depthOf(category, byId) * 12 }}
              className={cn(
                "flex w-full items-center gap-2 rounded-md py-1 pr-2 text-sm",
                selected === category.id ? "bg-accent" : "hover:bg-accent/50",
              )}
            >
              <Folder className="size-4 text-muted-foreground" />
              {category.name}
            </button>
          ))}
        </div>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (folderName) newFolder.mutate();
          }}
          className="mt-3 flex gap-1.5"
        >
          <Input
            value={folderName}
            onChange={(event) => setFolderName(event.target.value)}
            placeholder="New folder"
            className="h-8"
          />
          <Button
            type="submit"
            size="icon"
            variant="secondary"
            aria-label="Add folder"
            disabled={!folderName || newFolder.isPending}
          >
            <FolderPlus className="size-4" />
          </Button>
        </form>
      </Window>

      <div className="space-y-4">
        <Window title="Upload">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              upload.mutate();
            }}
            className="flex flex-wrap items-center gap-2"
          >
            <Input
              placeholder="Name (optional)"
              value={uploadName}
              onChange={(event) => setUploadName(event.target.value)}
              className="max-w-xs"
            />
            <input
              ref={fileRef}
              type="file"
              accept=".docx,.md,.txt"
              className="text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:text-foreground"
            />
            <Button type="submit" disabled={upload.isPending}>
              {upload.isPending ? "Uploading..." : "Upload"}
            </Button>
          </form>
        </Window>

        <Window title={`Documents${documents.data ? ` (${documents.data.count})` : ""}`}>
          {documents.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, index) => (
                <Skeleton key={index} className="h-8 w-full" />
              ))}
            </div>
          ) : documents.data && documents.data.results.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents.data.results.map((document) => (
                  <TableRow key={document.id}>
                    <TableCell>
                      <Link
                        href={`/documents/${document.id}`}
                        className="text-foreground underline-offset-2 hover:underline"
                      >
                        {document.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{document.doc_type}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {document.latest_job ? document.latest_job.status : "not analyzed"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => analyze.mutate(document.id)}
                        disabled={analyze.isPending && analyze.variables === document.id}
                      >
                        {analyze.isPending && analyze.variables === document.id
                          ? "Queued..."
                          : "Analyze"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">
              No documents here. Upload a policy or procedure to get started.
            </p>
          )}
        </Window>
      </div>
    </div>
  );
}
