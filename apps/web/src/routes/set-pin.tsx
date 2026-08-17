import { useState } from "react";

import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PinInput } from "@/components/ui/pin-input";
import { orpc } from "@/utils/orpc";

// Deliberately outside `_auth`: that layout bounces anyone with a session to the
// dashboard, and the recipient of an invite may well be signed in on a shared
// tablet. The token in the URL is the credential here, not the session.
export const Route = createFileRoute("/set-pin")({
  validateSearch: (search: Record<string, unknown>): { token: string } => ({
    token: typeof search.token === "string" ? search.token : "",
  }),
  head: () => ({ meta: [{ title: "Rim-Genie | Set your PIN" }] }),
  component: SetPinPage,
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col bg-page font-rubik">
      <div className="flex flex-1 items-center justify-center px-4 py-8">
        <div className="flex w-full max-w-[380px] flex-col gap-4 rounded-xl border border-card-line bg-white p-5 shadow-card">
          {children}
        </div>
      </div>
    </div>
  );
}

function SetPinPage() {
  const { token } = Route.useSearch();
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [done, setDone] = useState(false);

  const inviteQuery = useQuery({
    ...orpc.employees.invite.verify.queryOptions({ input: { token } }),
    enabled: !!token,
    retry: false,
  });

  const setPinMutation = useMutation({
    ...orpc.employees.invite.setPin.mutationOptions(),
    onSuccess: () => setDone(true),
    onError: (err: Error) => toast.error(err.message),
  });

  const mismatch = confirmPin.length === 4 && pin !== confirmPin;
  const canSubmit = pin.length === 4 && pin === confirmPin && !setPinMutation.isPending;

  if (done) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 text-center">
          <CheckCircle2 className="size-12 text-green" />
          <p className="font-rubik text-base leading-5 font-medium text-body">Your PIN is set</p>
          <p className="font-rubik text-sm leading-4.5 text-label">
            Sign in with your Employee ID and the PIN you just chose.
          </p>
          <Button nativeButton={false} render={<Link to="/login" />} fullWidth>
            Go to sign in
          </Button>
        </div>
      </Shell>
    );
  }

  if (!token || (inviteQuery.data && !inviteQuery.data.valid) || inviteQuery.isError) {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 text-center">
          <p className="font-rubik text-base leading-5 font-medium text-body">
            This link is not valid
          </p>
          <p className="font-rubik text-sm leading-4.5 text-label">
            It may have expired or already been used. Ask an administrator to send you a new invite.
          </p>
          <Button variant="outline" nativeButton={false} render={<Link to="/login" />} fullWidth>
            Back to sign in
          </Button>
        </div>
      </Shell>
    );
  }

  if (inviteQuery.isLoading || !inviteQuery.data) {
    return (
      <Shell>
        <p className="text-center font-rubik text-sm text-label">Checking your invite…</p>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex size-12 items-center justify-center rounded-full border-8 border-blue/10 bg-blue/20">
          <ShieldCheck className="size-6 text-blue" />
        </div>
        <p className="font-rubik text-base leading-5 font-medium text-body">
          Welcome, {inviteQuery.data.name}
        </p>
        <p className="font-rubik text-sm leading-4.5 text-label">
          Choose a 4-digit PIN. You will use it with Employee ID{" "}
          <span className="font-medium text-body">{inviteQuery.data.employeeId}</span> to sign in.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <Label>New PIN</Label>
          <PinInput value={pin} onChange={setPin} />
        </div>
        <div className="flex flex-col gap-1">
          <Label>Confirm PIN</Label>
          <PinInput value={confirmPin} onChange={setConfirmPin} />
          {mismatch && (
            <p className="font-rubik text-xs text-red">Both PINs must match.</p>
          )}
        </div>
      </div>

      <Button
        fullWidth
        disabled={!canSubmit}
        onClick={() => setPinMutation.mutate({ token, pin })}
      >
        {setPinMutation.isPending ? "Saving..." : "Set my PIN"}
      </Button>

      <p className="text-center font-rubik text-xs leading-4 text-label">
        Keep your PIN private — it is how the system knows the work is yours.
      </p>
    </Shell>
  );
}
