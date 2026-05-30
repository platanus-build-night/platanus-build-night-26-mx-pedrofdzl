"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { ingestQuestionnaire, listQuestionnaires, uploadQuestionnaire } from "@/lib/resources";

const statusVariant: Record<string, "secondary" | "warning" | "success"> = {
  open: "secondary",
  in_progress: "warning",
  submitted: "success",
};

export default function QuestionnairesPage() {
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["questionnaires"],
    queryFn: listQuestionnaires,
  });

  const upload = useMutation({
    mutationFn: async () => {
      const file = fileRef.current?.files?.[0];
      if (!file) throw new Error("Choose a CSV or Excel file first.");
      const form = new FormData();
      form.append("source_name", name || file.name);
      form.append("raw_file", file);
      const questionnaire = await uploadQuestionnaire(form);
      const summary = await ingestQuestionnaire(questionnaire.id);
      return summary;
    },
    onSuccess: (summary) => {
      toast.success(`Imported ${summary.requirements} requirements.`);
      setName("");
      if (fileRef.current) fileRef.current.value = "";
      queryClient.invalidateQueries({ queryKey: ["questionnaires"] });
    },
    onError: (error) => toast.error((error as Error).message),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">Questionnaires</h1>

      <Window title="Import a questionnaire">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            upload.mutate();
          }}
          className="flex flex-wrap items-center gap-2"
        >
          <Input
            placeholder="Bank name (optional)"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="max-w-xs"
          />
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx"
            className="text-sm text-muted-foreground file:mr-3 file:rounded-md file:border file:border-border file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:text-foreground"
          />
          <Button type="submit" disabled={upload.isPending}>
            {upload.isPending ? "Importing..." : "Upload & ingest"}
          </Button>
        </form>
      </Window>

      <Window title={`All questionnaires${data ? ` (${data.count})` : ""}`}>
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-8 w-full" />
            ))}
          </div>
        ) : data && data.results.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Bank</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due</TableHead>
                <TableHead className="text-right">Uploaded</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.results.map((questionnaire) => (
                <TableRow key={questionnaire.id}>
                  <TableCell>
                    <Link
                      href={`/questionnaires/${questionnaire.id}`}
                      className="text-foreground underline-offset-2 hover:underline"
                    >
                      {questionnaire.source_name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[questionnaire.status] ?? "secondary"}>
                      {questionnaire.status}
                    </Badge>
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
            No questionnaires yet. Upload a CSV or Excel file to import its requirements.
          </p>
        )}
      </Window>
    </div>
  );
}
