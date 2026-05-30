"use client";

import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import { Window, Stat } from "@/components/window";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

type Setup = { otpauth_url: string; qr: string };

export default function AccountPage() {
  const { user, refreshUser } = useAuth();
  const [setup, setSetup] = useState<Setup | null>(null);
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);

  async function begin() {
    setBusy(true);
    try {
      setSetup(await api<Setup>("/auth/2fa/setup/", { method: "POST" }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start setup");
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/auth/2fa/verify/", {
        method: "POST",
        body: JSON.stringify({ otp }),
      });
      toast.success("Two-factor authentication enabled");
      setSetup(null);
      setOtp("");
      await refreshUser();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setBusy(false);
    }
  }

  if (!user) return null;

  return (
    <div className="max-w-3xl space-y-4">
      <h1 className="text-xl font-semibold tracking-tight">Account</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <Stat label="Operator" value={<span className="text-base">{user.email}</span>} />
        <Stat
          label="2FA Status"
          value={user.two_factor_enabled ? "Enabled" : "Disabled"}
          tone={user.two_factor_enabled ? "success" : "warning"}
        />
      </div>

      <Window
        title="Two-Factor Authentication"
        actions={
          <Badge variant={user.two_factor_enabled ? "success" : "warning"}>
            {user.two_factor_enabled ? "On" : "Off"}
          </Badge>
        }
      >
        {user.two_factor_enabled ? (
          <p className="text-sm text-muted-foreground">
            TOTP is active on this account. A 6-digit code from your
            authenticator app is required at logon.
          </p>
        ) : setup ? (
          <form onSubmit={verify} className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Scan this code with an authenticator app, then enter the 6-digit
              code to confirm.
            </p>
            <div className="inline-block border border-border bg-white p-3">
              <Image
                src={setup.qr}
                alt="TOTP QR code"
                width={160}
                height={160}
                unoptimized
                className="block size-40"
              />
            </div>
            <p className="mono text-xs break-all text-muted-foreground">
              {setup.otpauth_url}
            </p>
            <div className="flex items-end gap-2">
              <div className="space-y-1">
                <Label className="text-sm font-medium">
                  Confirmation Code
                </Label>
                <Input
                  inputMode="numeric"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="000000"
                  className="w-32"
                  required
                />
              </div>
              <Button type="submit" disabled={busy}>
                {busy ? "Verifying..." : "Confirm"}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Add a time-based one-time password (TOTP) as a second factor at
              logon.
            </p>
            <Button onClick={begin} disabled={busy}>
              {busy ? "Starting..." : "Enable 2FA"}
            </Button>
          </div>
        )}
      </Window>
    </div>
  );
}
