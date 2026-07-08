import { useEffect, useState } from "react";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { client, orpc } from "@/utils/orpc";

export function PricingConfigTab() {
  const queryClient = useQueryClient();
  const { data: config, isLoading } = useQuery(orpc.catalog.config.get.queryOptions());

  const [steelDiscount, setSteelDiscount] = useState("");
  const [truckMarkup, setTruckMarkup] = useState("");

  useEffect(() => {
    if (config) {
      setSteelDiscount(String(config.steelDiscountPercent));
      setTruckMarkup(String(config.truckMarkupPercent));
    }
  }, [config]);

  const updateMutation = useMutation({
    mutationFn: (input: { steelDiscountPercent: number; truckMarkupPercent: number }) =>
      client.catalog.config.update(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: orpc.catalog.config.get.key() });
      toast.success("Pricing config updated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSave = () => {
    const steel = Number.parseInt(steelDiscount, 10);
    const truck = Number.parseInt(truckMarkup, 10);
    if (Number.isNaN(steel) || steel < 0 || steel > 100) return;
    if (Number.isNaN(truck) || truck < 0 || truck > 1000) return;
    updateMutation.mutate({ steelDiscountPercent: steel, truckMarkupPercent: truck });
  };

  if (isLoading) {
    return (
      <div className="flex max-w-md flex-col gap-4">
        <div className="h-10 w-full animate-pulse rounded-md bg-page" />
        <div className="h-10 w-full animate-pulse rounded-md bg-page" />
      </div>
    );
  }

  return (
    <div className="flex max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="font-rubik text-sm leading-4.5 text-body">Steel discount (%)</label>
        <input
          type="number"
          min={0}
          max={100}
          value={steelDiscount}
          onChange={(e) => setSteelDiscount(e.target.value)}
          className="flex h-10 w-full rounded-md border border-field-line bg-white px-3 py-2.5 font-rubik text-sm text-body outline-none placeholder:text-ghost"
        />
        <span className="font-rubik text-xs leading-3.5 text-label">
          Percent taken off the aluminum base price when Steel is selected.
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="font-rubik text-sm leading-4.5 text-body">Truck markup (%)</label>
        <input
          type="number"
          min={0}
          max={1000}
          value={truckMarkup}
          onChange={(e) => setTruckMarkup(e.target.value)}
          className="flex h-10 w-full rounded-md border border-field-line bg-white px-3 py-2.5 font-rubik text-sm text-body outline-none placeholder:text-ghost"
        />
        <span className="font-rubik text-xs leading-3.5 text-label">
          Percent added to rim-service prices when the vehicle is a Truck.
        </span>
      </div>

      <Button className="self-start" disabled={updateMutation.isPending} onClick={handleSave}>
        {updateMutation.isPending ? "Saving..." : "Save"}
      </Button>
    </div>
  );
}
