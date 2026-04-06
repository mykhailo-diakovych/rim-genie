import { useState } from "react";

import { useForm } from "@tanstack/react-form";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { MapPin, UserRound } from "lucide-react";
import { toast } from "sonner";
import z from "zod";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PinInput } from "@/components/ui/pin-input";
import { Select, SelectOption, SelectPopup, SelectTrigger } from "@/components/ui/select";
import { m } from "@/paraglide/messages";
import { orpc } from "@/utils/orpc";

function setLocationCookie(locationId: string) {
  document.cookie = `rim-genie-location=${encodeURIComponent(locationId)}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
}

export function StaffLoginForm() {
  const navigate = useNavigate();
  const [pin, setPin] = useState("");
  const [locationId, setLocationId] = useState("");

  const { data: locations } = useQuery(orpc.locations.queryOptions({}));

  const form = useForm({
    defaultValues: { employeeId: "" },
    onSubmit: async ({ value }) => {
      await authClient.signIn.username(
        { username: value.employeeId, password: pin },
        {
          onSuccess: () => {
            if (locationId) {
              setLocationCookie(locationId);
            }
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
        employeeId: z.string().min(1, m.validation_employee_id_required()),
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
              <Label htmlFor={field.name}>{m.label_employee_id()}</Label>
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
                <p className="font-rubik text-xs text-red">{field.state.meta.errors[0]?.message}</p>
              )}
            </div>
          )}
        </form.Field>

        <div className="flex flex-col gap-1">
          <Label>{m.label_enter_pin()}</Label>
          <PinInput value={pin} onChange={setPin} />
        </div>

        {locations && locations.length > 0 && (
          <div className="flex flex-col gap-1">
            <Label>Location</Label>
            <Select value={locationId} onValueChange={(v) => setLocationId(v ?? "")}>
              <SelectTrigger>
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <MapPin className="size-4 shrink-0 text-ghost" />
                  <span className="min-w-0 truncate text-left">
                    {locationId ? (
                      <span className="text-body">
                        {locations?.find((l) => l.id === locationId)?.name ?? "—"}
                      </span>
                    ) : (
                      <span className="text-ghost">Select location</span>
                    )}
                  </span>
                </div>
              </SelectTrigger>
              <SelectPopup>
                {locations.map((loc) => (
                  <SelectOption key={loc.id} value={loc.id}>
                    {loc.name}
                  </SelectOption>
                ))}
              </SelectPopup>
            </Select>
          </div>
        )}
      </div>

      <form.Subscribe>
        {(state) => (
          <Button
            type="submit"
            fullWidth
            disabled={!state.canSubmit || state.isSubmitting || pin.length !== 4}
          >
            {state.isSubmitting ? m.btn_logging_in() : m.btn_login()}
          </Button>
        )}
      </form.Subscribe>

      <p className="text-center font-rubik text-xs leading-4 text-label">{m.staff_pin_help()}</p>
    </form>
  );
}
