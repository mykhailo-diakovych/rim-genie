import { createFileRoute } from "@tanstack/react-router";
import { Check, ChevronDown, SquareCheckBig } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { SignatureModal } from "@/components/terms/signature-modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SERVICE_TERMS = [
  {
    id: 1,
    title: "Tire/Center Cap Damage",
    description:
      "Rim Genie is not liable for pre-existing tire conditions including dry rot, crystallization, aging, warehoused tires, or damage from driving on low tire pressure. A thorough inspection is performed prior to service, but Rim Genie cannot guarantee detection of all such underlying issues.",
  },
  {
    id: 2,
    title: "Scratches/Discoloration",
    description:
      "The heating process used to restore rim structure may cause slight color changes, surface discoloration, or burning. Rim Genie is not liable for such cosmetic effects resulting from the repair process.",
  },
  {
    id: 3,
    title: "Lug Nut/Stud Damage",
    description:
      "Rim Genie is not responsible for any damage to lug nuts or studs during the removal and installation process. We recommend customers inspect their lug nuts and studs prior to service.",
  },
  {
    id: 4,
    title: "Welding Warranty",
    description:
      "Rim Genie offers a one-month warranty on welding performed on rims that are completely straightened. This warranty is voided if the rim is out of round or bent. The warranty applies solely to the weld itself and does not cover issues caused by additional structural or cosmetic imperfections. This warranty does not apply to commercial vehicles and public passenger vehicles.",
  },
  {
    id: 5,
    title: "Diamond Cutting Variations",
    description:
      "Slight appearance differences may occur if not all four rims are diamond cut simultaneously. Rim Genie recommends cutting all four rims at once for a consistent finish. Rim Genie is not responsible for perceived differences if only some rims undergo diamond cutting.",
  },
  {
    id: 6,
    title: "General Inspection Limitation",
    description:
      "A visual and structural inspection is performed prior to service, but underlying conditions or latent defects may not be immediately visible. The customer acknowledges and accepts these limitations.",
  },
  {
    id: 7,
    title: "Acknowledgment",
    description:
      "By signing, you acknowledge that you have read, understood and agreed to the terms outlined above.",
  },
];

export const Route = createFileRoute("/_app/terms")({
  component: TermsPage,
});

function TermsPage() {
  const [accepted, setAccepted] = useState<Set<number>>(new Set());
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [signatureOpen, setSignatureOpen] = useState(false);

  const allAccepted = accepted.size === SERVICE_TERMS.length;

  function toggleAccept(id: number) {
    setAccepted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleExpand(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function acceptAll() {
    setAccepted(new Set(SERVICE_TERMS.map((t) => t.id)));
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-1 flex-col gap-6 px-5 pt-4">
        <div className="flex items-center justify-between">
          <h1 className="font-rubik text-[22px] leading-[26px] font-medium text-body">
            Service Terms &amp; Acknowledgment
          </h1>
          <Button variant="outline" color="success" onClick={acceptAll} disabled={allAccepted}>
            <SquareCheckBig />
            Accept all
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          {SERVICE_TERMS.map((term, index) => {
            const isAccepted = accepted.has(term.id);
            const isExpanded = expanded.has(term.id);

            return (
              <div
                key={term.id}
                className={cn(
                  "flex flex-col gap-4 overflow-hidden rounded-xl border bg-white px-3 py-2.5 shadow-sm transition-colors",
                  isAccepted ? "border-green" : "border-card-line",
                )}
              >
                <div className="flex items-center gap-4">
                  <p className="flex-1 font-rubik text-sm font-medium text-body">
                    {index + 1}. {term.title}
                  </p>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={() => toggleAccept(term.id)}
                      aria-pressed={isAccepted}
                      className="flex h-9 cursor-pointer items-center gap-1.5"
                    >
                      <span
                        className={cn(
                          "flex size-5 items-center justify-center rounded-sm border-[1.2px] transition-colors",
                          isAccepted ? "border-green" : "border-[#cdcfd1]",
                        )}
                      >
                        {isAccepted && <Check className="size-3 text-green" strokeWidth={2.5} />}
                      </span>
                      <span className="font-rubik text-sm text-body">Accept</span>
                    </button>
                    <button
                      onClick={() => toggleExpand(term.id)}
                      aria-expanded={isExpanded}
                      className="flex size-9 cursor-pointer items-center justify-center rounded-md border border-blue text-blue"
                    >
                      <ChevronDown
                        className={cn(
                          "transition-transform duration-200",
                          isExpanded && "rotate-180",
                        )}
                      />
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <p className="font-rubik text-sm leading-[18px] text-body">{term.description}</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-center border-t border-card-line bg-white px-5 py-3">
        <Button
          color="success"
          className="w-32"
          disabled={!allAccepted}
          onClick={() => setSignatureOpen(true)}
        >
          Sign
        </Button>
      </div>

      <SignatureModal
        open={signatureOpen}
        onOpenChange={setSignatureOpen}
        onSign={() => toast.success("Terms signed successfully")}
      />
    </div>
  );
}
