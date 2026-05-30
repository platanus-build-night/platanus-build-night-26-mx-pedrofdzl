"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, FileText, Folder, FolderPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FileUpload } from "@/components/ui/file-upload";
import { Input } from "@/components/ui/input";
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
  type Document,
} from "@/lib/resources";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<string, string> = {
  pending: "Queued",
  running: "Analyzing",
  done: "Analyzed",
  failed: "Failed",
};

function StatusPill({ doc }: { doc: Document }) {
  const status = doc.latest_job?.status;
  if (!status) return <span className="text-muted-foreground">Not analyzed</span>;
  const tone =
    status === "done"
      ? "text-success"
      : status === "failed"
        ? "text-destructive"
        : "text-muted-foreground";
  return <span className={tone}>{STATUS_LABEL[status] ?? status}</span>;
}

function pathOf(folderId: number | null, byId: Map<number, Category>) {
  const path: Category[] = [];
  let cur = folderId != null ? byId.get(folderId) : undefined;
  while (cur) {
    path.unshift(cur);
    cur = cur.parent != null ? byId.get(cur.parent) : undefined;
  }
  return path;
}

export default function DocumentsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { track } = useAnalysis();
  const [selected, setSelected] = useState<number | null>(null);
  const [folderName, setFolderName] = useState("");
  const [folderOpen, setFolderOpen] = useState(false);
  const [uploadName, setUploadName] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  const categories = useQuery({ queryKey: ["categories"], queryFn: listCategories });
  const documents = useQuery({ queryKey: ["documents"], queryFn: () => listDocuments() });

  const allCategories = categories.data?.results ?? [];
  const allDocuments = documents.data?.results ?? [];
  const byId = new Map(allCategories.map((c) => [c.id, c]));

  const subfolders = allCategories.filter((c) => c.parent === selected);
  const files = allDocuments.filter((d) => d.category === selected);
  const trail = pathOf(selected, byId);

  const countInside = (id: number) =>
    allCategories.filter((c) => c.parent === id).length +
    allDocuments.filter((d) => d.category === id).length;

  const newFolder = useMutation({
    mutationFn: () => createCategory({ name: folderName.trim(), parent: selected }),
    onSuccess: () => {
      setFolderName("");
      setFolderOpen(false);
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const upload = useMutation({
    mutationFn: async () => {
      if (!uploadFile) throw new Error("Choose a file first.");
      const name = uploadName || uploadFile.name;
      if (uploadFile.name.toLowerCase().endsWith(".docx")) {
        const form = new FormData();
        form.append("name", name);
        form.append("doc_type", "docx");
        if (selected != null) form.append("category", String(selected));
        form.append("source_file", uploadFile);
        return uploadDocument(form);
      }
      const content = await uploadFile.text();
      return createTextDocument({ name, content, category: selected });
    },
    onSuccess: () => {
      toast.success("Document uploaded.");
      setUploadName("");
      setUploadFile(null);
      queryClient.invalidateQueries({ queryKey: ["documents"] });
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const analyze = useMutation({
    mutationFn: (id: number) => analyzeDocument(id),
    onSuccess: (job) => track(job.id),
    onError: (error) => toast.error((error as Error).message),
  });

  const isEmpty = subfolders.length === 0 && files.length === 0;

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold tracking-tight">Documents</h1>

      <Window title="Upload document">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            upload.mutate();
          }}
          className="space-y-3"
        >
          <FileUpload
            accept=".docx,.md,.txt"
            value={uploadFile}
            onChange={setUploadFile}
            disabled={upload.isPending}
            hint="Accepts .docx, .md, .txt"
          />
          <div className="flex items-center gap-3">
            <Input
              placeholder="Name (optional, defaults to filename)"
              value={uploadName}
              onChange={(event) => setUploadName(event.target.value)}
              disabled={upload.isPending}
            />
            <Button type="submit" disabled={!uploadFile || upload.isPending} className="shrink-0">
              {upload.isPending ? "Uploading..." : "Upload"}
            </Button>
          </div>
        </form>
      </Window>

      <Window
        title={
          <nav className="flex items-center gap-0.5 text-sm">
            <button
              onClick={() => setSelected(null)}
              className={cn(
                "rounded-sm px-1.5 py-0.5 transition-colors hover:bg-accent",
                selected === null ? "text-foreground" : "text-muted-foreground",
              )}
            >
              All documents
            </button>
            {trail.map((folder) => (
              <span key={folder.id} className="flex items-center gap-0.5">
                <ChevronRight className="size-3.5 text-muted-foreground/60" />
                <button
                  onClick={() => setSelected(folder.id)}
                  className={cn(
                    "rounded-sm px-1.5 py-0.5 transition-colors hover:bg-accent",
                    folder.id === selected ? "text-foreground" : "text-muted-foreground",
                  )}
                >
                  {folder.name}
                </button>
              </span>
            ))}
          </nav>
        }
        actions={
          <Dialog open={folderOpen} onOpenChange={setFolderOpen}>
            <DialogTrigger
              render={
                <Button variant="tertiary" size="sm">
                  <FolderPlus />
                  New folder
                </Button>
              }
            />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New folder</DialogTitle>
              </DialogHeader>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  if (folderName.trim()) newFolder.mutate();
                }}
              >
                <Input
                  autoFocus
                  value={folderName}
                  onChange={(event) => setFolderName(event.target.value)}
                  placeholder="Folder name"
                />
                <DialogFooter className="mt-4">
                  <Button type="submit" disabled={!folderName.trim() || newFolder.isPending}>
                    {newFolder.isPending ? "Creating..." : "Create"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
        bodyClassName={isEmpty ? undefined : "p-0 overflow-hidden"}
      >
        {isEmpty ? (
          <p className="text-sm text-muted-foreground">
            This folder is empty. Create a subfolder or upload a policy to get started.
          </p>
        ) : (
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
              {subfolders.map((folder) => (
                <TableRow
                  key={`folder-${folder.id}`}
                  onClick={() => setSelected(folder.id)}
                  className="cursor-pointer"
                >
                  <TableCell>
                    <span className="flex items-center gap-2.5 font-medium text-foreground">
                      <Folder className="size-4 shrink-0 text-muted-foreground" />
                      {folder.name}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground">Folder</TableCell>
                  <TableCell className="text-muted-foreground">
                    {countInside(folder.id)} items
                  </TableCell>
                  <TableCell />
                </TableRow>
              ))}
              {files.map((doc) => (
                <TableRow
                  key={`doc-${doc.id}`}
                  onClick={() => router.push(`/documents/${doc.id}`)}
                  className="cursor-pointer"
                >
                  <TableCell>
                    <span className="flex items-center gap-2.5 text-foreground">
                      <FileText className="size-4 shrink-0 text-muted-foreground" />
                      {doc.name}
                    </span>
                  </TableCell>
                  <TableCell className="text-muted-foreground uppercase">{doc.doc_type}</TableCell>
                  <TableCell>
                    <StatusPill doc={doc} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={(event) => {
                        event.stopPropagation();
                        analyze.mutate(doc.id);
                      }}
                      disabled={analyze.isPending && analyze.variables === doc.id}
                    >
                      {analyze.isPending && analyze.variables === doc.id ? "Queued..." : "Analyze"}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Window>
    </div>
  );
}
