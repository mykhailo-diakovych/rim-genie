import { MessageSquare } from "lucide-react";

import { Button } from "@/components/ui/button";

interface CommentsSectionProps {
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  isSaving?: boolean;
  disabled?: boolean;
  label?: string;
}

export function CommentsSection({
  value,
  onChange,
  onSave,
  isSaving = false,
  disabled = false,
  label = "Comments",
}: CommentsSectionProps) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-card-line bg-card p-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="size-4 text-label" />
        <span className="font-rubik text-sm font-medium text-body">{label}</span>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Enter comment..."
        rows={3}
        disabled={disabled}
        className="w-full resize-none rounded-md border border-field-line bg-white p-2 font-rubik text-sm text-body transition-colors outline-none placeholder:text-ghost disabled:cursor-not-allowed disabled:opacity-50"
      />
      {!disabled && (
        <div className="flex justify-end">
          <Button onClick={onSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Comment"}
          </Button>
        </div>
      )}
    </div>
  );
}
