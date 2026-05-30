"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";
import { Window } from "@/components/window";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await register(email, password);
      toast.success("Account created");
      router.replace("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Window title="Create account" className="w-full max-w-sm">
        <form onSubmit={onSubmit} className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Create your account to get started.
          </p>
          <div className="space-y-1">
            <Label className="text-sm font-medium">
              Email
            </Label>
            <Input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label className="text-sm font-medium">
              Password
            </Label>
            <Input
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
            />
            <p className="text-xs text-muted-foreground">
              Minimum 8 characters.
            </p>
          </div>
          <div className="flex items-center justify-between pt-1">
            <Link
              href="/login"
              className="text-sm text-brand underline-offset-2 hover:underline"
            >
              Back to sign in
            </Link>
            <Button type="submit" disabled={busy}>
              {busy ? "Creating..." : "Create"}
            </Button>
          </div>
        </form>
      </Window>
    </div>
  );
}
