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

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [needsOtp, setNeedsOtp] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await login(email, password, otp);
      router.replace("/dashboard");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Login failed";
      if (/2fa|otp/i.test(msg)) setNeedsOtp(true);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <Window title="Sign in" className="w-full max-w-sm">
        <form onSubmit={onSubmit} className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Sign in to your workspace.
          </p>
          <Field label="Email">
            <Input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </Field>
          {needsOtp ? (
            <Field label="2FA Code">
              <Input
                inputMode="numeric"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="000000"
              />
            </Field>
          ) : null}
          <div className="flex items-center justify-between pt-1">
            <Link
              href="/register"
              className="text-sm text-brand underline-offset-2 hover:underline"
            >
              Create account
            </Link>
            <Button type="submit" disabled={busy}>
              {busy ? "Signing in..." : "Sign in"}
            </Button>
          </div>
        </form>
      </Window>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-sm font-medium">
        {label}
      </Label>
      {children}
    </div>
  );
}
