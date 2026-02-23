import { useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import { Lock, Mail } from "lucide-react";
import { toast } from "sonner";
import z from "zod";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { m } from "@/paraglide/messages";

export function EmailLoginForm() {
  const navigate = useNavigate();

  const form = useForm({
    defaultValues: { email: "", password: "" },
    onSubmit: async ({ value }) => {
      await authClient.signIn.email(
        { email: value.email, password: value.password },
        {
          onSuccess: () => {
            navigate({ to: "/dashboard" });
            toast.success(m.toast_signed_in());
          },
          onError: (error) => {
            toast.error(error.error.message || error.error.statusText);
          },
        },
      );
    },
    validators: {
      onSubmit: z.object({
        email: z.email(m.validation_invalid_email()),
        password: z.string().min(1, m.validation_password_required()),
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
        <form.Field name="email">
          {(field) => (
            <div className="flex flex-col gap-1">
              <Label htmlFor={field.name}>{m.label_email()}</Label>
              <Input
                id={field.name}
                name={field.name}
                type="email"
                value={field.state.value}
                leadingIcon={<Mail className="size-4" />}
                error={field.state.meta.errors.length > 0}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              {field.state.meta.errors.length > 0 && (
                <p className="font-rubik text-xs text-red">{field.state.meta.errors[0]?.message}</p>
              )}
            </div>
          )}
        </form.Field>

        <form.Field name="password">
          {(field) => (
            <div className="flex flex-col gap-1">
              <Label htmlFor={field.name}>{m.label_password()}</Label>
              <Input
                id={field.name}
                name={field.name}
                type="password"
                value={field.state.value}
                leadingIcon={<Lock className="size-4" />}
                error={field.state.meta.errors.length > 0}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              {field.state.meta.errors.length > 0 && (
                <p className="font-rubik text-xs text-red">{field.state.meta.errors[0]?.message}</p>
              )}
            </div>
          )}
        </form.Field>
      </div>

      <form.Subscribe>
        {(state) => (
          <Button type="submit" fullWidth disabled={!state.canSubmit || state.isSubmitting}>
            {state.isSubmitting ? m.btn_logging_in() : m.btn_login()}
          </Button>
        )}
      </form.Subscribe>
    </form>
  );
}
