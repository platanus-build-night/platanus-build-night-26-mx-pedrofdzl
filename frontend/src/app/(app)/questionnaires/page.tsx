"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/ui/file-upload";
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
import { ingestQuestionnaire, listQuestionnaires, uploadQuestionnaire } from "@/lib/resources";

const statusVariant: Record<string, "secondary" | "warning" | "success"> = {
  open: "secondary",
  in_progress: "warning",
  submitted: "success",
};

const statusLabel: Record<string, string> = {
  open: "Open",
  in_progress: "In progress",
  submitted: "Submitted",
};

function Progress({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground">
        {done}/{total}
      </span>
    </div>
  );
}

export default function QuestionnairesPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["questionnaires"],
    queryFn: listQuestionnaires,
  });

  const upload = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Choose a CSV or Excel file first.");
      const form = new FormData();
      form.append("source_name", name || file.name);
      form.append("raw_file", file);
      const questionnaire = await uploadQuestionnaire(form);
      return ingestQuestionnaire(questionnaire.id);
    },
    onSuccess: (summary) => {
      toast.success(`Imported ${summary.requirements} requirements.`);
      setName("");
      setFile(null);
      queryClient.invalidateQueries({ queryKey: ["questionnaires"] });
    },
    onError: (error) => toast.error((error as Error).message),
  });

  const rows = data?.results ?? [];

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold tracking-tight">Questionnaires</h1>

      <Window title="Import a questionnaire">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            upload.mutate();
          }}
          className="space-y-3"
        >
          <FileUpload
            accept=".csv,.xlsx"
            value={file}
            onChange={setFile}
            disabled={upload.isPending}
            hint="Accepts .csv, .xlsx in any column layout"
          />
          <div className="flex items-center gap-3">
            <Input
              placeholder="Bank name (optional, defaults to filename)"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={upload.isPending}
            />
            <Button type="submit" disabled={!file || upload.isPending} className="shrink-0">
              {upload.isPending ? "Importing..." : "Upload & ingest"}
            </Button>
          </div>
        </form>
      </Window>

      <Window
        title={`All questionnaires${data ? ` (${data.count})` : ""}`}
        bodyClassName={rows.length === 0 ? undefined : "p-0 overflow-hidden"}
      >
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-8 w-full" />
            ))}
          </div>
        ) : rows.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bank</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Issues</TableHead>
                <TableHead>Due</TableHead>
                <TableHead className="text-right">Uploaded</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((questionnaire) => (
                <TableRow
                  key={questionnaire.id}
                  onClick={() => router.push(`/questionnaires/${questionnaire.id}`)}
                  className="cursor-pointer"
                >
                  <TableCell>
                    <span className="flex items-center gap-2.5 font-medium text-foreground">
                      <FileSpreadsheet className="size-4 shrink-0 text-muted-foreground" />
                      {questionnaire.source_name}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[questionnaire.status] ?? "secondary"}>
                      {statusLabel[questionnaire.status] ?? questionnaire.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Progress
                      done={questionnaire.answered_count}
                      total={questionnaire.requirement_count}
                    />
                  </TableCell>
                  <TableCell>
                    {questionnaire.open_issue_count > 0 ? (
                      <Badge variant="warning">{questionnaire.open_issue_count}</Badge>
                    ) : (
                      <span className="text-muted-foreground/60">0</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {questionnaire.due_date ?? "-"}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {questionnaire.uploaded_at.slice(0, 10)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-muted-foreground">
            No questionnaires yet. Upload a CSV or Excel file in any layout to import its
            requirements.
          </p>
        )}
      </Window>
    </div>
  );
}
