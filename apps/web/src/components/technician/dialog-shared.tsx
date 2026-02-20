export function DialogCustomerRow({ customer, jobId }: { customer: string; jobId: string }) {
  return (
    <div className="flex items-baseline justify-between border-b border-field-line pt-3 pb-2 font-rubik text-sm leading-[18px]">
      <span className="font-medium text-body">{customer}</span>
      <div className="flex items-baseline gap-1">
        <span className="text-label">Job ID:</span>
        <span className="text-body">{jobId}</span>
      </div>
    </div>
  );
}
