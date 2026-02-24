import { useState } from "react";

import { createFileRoute } from "@tanstack/react-router";

import { EmailLoginForm } from "@/components/auth/email-login-form";
import { StaffLoginForm } from "@/components/auth/staff-login-form";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { m } from "@/paraglide/messages";

export const Route = createFileRoute("/_auth/login")({
  head: () => ({
    meta: [{ title: "Rim-Genie | Login" }],
  }),
  component: LoginPage,
});

type LoginTab = "email" | "staff";

const LOGIN_TABS = [
  { value: "email" as const, label: m.login_tab_email() },
  { value: "staff" as const, label: m.login_tab_staff() },
];

function LoginPage() {
  const [tab, setTab] = useState<LoginTab>("email");

  return (
    <div className="w-full max-w-[368px] rounded-xl border border-card-line bg-white px-6 py-4 shadow-card">
      <div className="flex flex-col items-center gap-8">
        <img src="/logo.png" alt={m.app_name()} className="h-[78px] w-[80px] object-contain" />

        <div className="flex w-full flex-col items-center gap-6">
          <div className="flex w-full items-center justify-between">
            <p className="font-rubik text-[22px] leading-6.5 font-medium text-body">
              {tab === "email" ? m.login_email_title() : m.login_staff_title()}
            </p>
            <SegmentedControl tabs={LOGIN_TABS} value={tab} onChange={setTab} />
          </div>

          {tab === "email" ? <EmailLoginForm /> : <StaffLoginForm />}
        </div>
      </div>
    </div>
  );
}
