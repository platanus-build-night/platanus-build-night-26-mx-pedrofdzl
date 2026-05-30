"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
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
  const [step, setStep] = useState<"credentials" | "otp">("credentials");
  const [busy, setBusy] = useState(false);

  async function attempt(code: string) {
    setBusy(true);
    try {
      await login(email, password, code);
      router.replace("/dashboard");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Login failed";
      if (/2fa|otp/i.test(msg)) {
        setStep("otp");
        if (code) toast.error(msg);
      } else {
        toast.error(msg);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Window title="Sign in" className="w-full max-w-sm">
      {step === "credentials" ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            attempt("");
          }}
          className="space-y-3"
        >
          <p className="text-sm text-muted-foreground">Sign in to your workspace.</p>
          <Field label="Email">
            <Input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </Field>
          <Field label="Password">
            <Input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </Field>
          <div className="flex items-center justify-between pt-1">
            <Link
              href="/register"
              className="text-sm text-brand underline-offset-2 hover:underline"
            >
              Create account
            </Link>
            <Button type="submit" disabled={busy}>
              {busy ? "Signing in..." : "Continue"}
            </Button>
          </div>
        </form>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            attempt(otp);
          }}
          className="space-y-3"
        >
          <p className="text-sm text-muted-foreground">
            Enter the 6-digit code from your authenticator app for{" "}
            <span className="text-foreground">{email}</span>.
          </p>
          <Field label="Authentication Code">
            <Input
              inputMode="numeric"
              autoFocus
              value={otp}
              onChange={(event) => setOtp(event.target.value)}
              placeholder="000000"
              required
            />
          </Field>
          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => {
                setStep("credentials");
                setOtp("");
              }}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" />
              Back
            </button>
            <Button type="submit" disabled={busy}>
              {busy ? "Verifying..." : "Verify"}
            </Button>
          </div>
        </form>
      )}
    </Window>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
    </div>
  );
}
