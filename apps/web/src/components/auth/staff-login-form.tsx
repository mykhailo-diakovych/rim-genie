import { useState } from "react";

import { useForm } from "@tanstack/react-form";
import { UserRound } from "lucide-react";
import { toast } from "sonner";
import z from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PinInput } from "@/components/ui/pin-input";

export function StaffLoginForm() {
  const [pin, setPin] = useState("");

  const form = useForm({
    defaultValues: { employeeId: "" },
    onSubmit: async () => {
      toast.info("Staff login coming soon");
    },
    validators: {
      onSubmit: z.object({
        employeeId: z.string().min(1, "Employee ID is required"),
      }),
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit();
      }}
      className="flex w-full flex-col gap-4"
    >
      <div className="flex flex-col gap-3">
        <form.Field name="employeeId">
          {(field) => (
            <div className="flex flex-col gap-1">
              <Label htmlFor={field.name}>Employee ID:</Label>
              <Input
                id={field.name}
                name={field.name}
                type="text"
                value={field.state.value}
                leadingIcon={<UserRound className="size-4" />}
                error={field.state.meta.errors.length > 0}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              {field.state.meta.errors.length > 0 && (
                <p className="font-rubik text-[12px] text-red">
                  {field.state.meta.errors[0]?.message}
                </p>
              )}
            </div>
          )}
        </form.Field>

        <div className="flex flex-col gap-1">
          <Label>Enter your PIN:</Label>
          <PinInput value={pin} onChange={setPin} />
        </div>
      </div>

      <form.Subscribe>
        {(state) => (
          <Button type="submit" fullWidth disabled={!state.canSubmit || state.isSubmitting}>
            {state.isSubmitting ? "Logging in..." : "Log In"}
          </Button>
        )}
      </form.Subscribe>

      <p className="text-center font-rubik text-[12px] leading-[16px] text-label">
        Use your assigned PIN. Contact admin if needed.
      </p>
    </form>
  );
}
