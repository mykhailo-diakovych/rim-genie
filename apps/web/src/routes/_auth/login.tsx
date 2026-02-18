import { useState } from "react";

import { createFileRoute } from "@tanstack/react-router";

import { EmailLoginForm } from "@/components/auth/email-login-form";
import { StaffLoginForm } from "@/components/auth/staff-login-form";
import { SegmentedControl } from "@/components/ui/segmented-control";

export const Route = createFileRoute("/_auth/login")({
  component: LoginPage,
});

type LoginTab = "email" | "staff";

const LOGIN_TABS = [
  { value: "email" as const, label: "Email" },
  { value: "staff" as const, label: "Staff" },
];

function LoginPage() {
  const [tab, setTab] = useState<LoginTab>("email");

  return (
    <div className="w-full max-w-[368px] rounded-[12px] border border-card-line bg-white px-6 py-4 shadow-[0px_2px_8px_0px_rgba(116,117,118,0.04)]">
      <div className="flex flex-col items-center gap-8">
        <img src="/logo.png" alt="Rim Genie" className="h-[78px] w-[80px] object-contain" />

        <div className="flex w-full flex-col items-center gap-6">
          <div className="flex w-full items-center justify-between">
            <p className="font-rubik font-medium text-[22px] leading-[26px] text-body">
              {tab === "email" ? "Email Login" : "Staff Login"}
            </p>
            <SegmentedControl tabs={LOGIN_TABS} value={tab} onChange={setTab} />
          </div>

          {tab === "email" ? <EmailLoginForm /> : <StaffLoginForm />}
        </div>
      </div>
    </div>
  );
}
