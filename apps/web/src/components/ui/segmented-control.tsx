import { tv } from "tailwind-variants";

const segmentedControl = tv({
  slots: {
    root: "flex items-start rounded-[8px] border border-toggle-line bg-white p-[2px]",
    tab: "flex items-center justify-center rounded-[6px] px-3 py-[5px] font-rubik text-[14px] leading-[18px] transition-colors",
  },
  variants: {
    active: {
      true: { tab: "bg-blue text-white" },
      false: { tab: "text-label" },
    },
  },
});

interface SegmentedControlProps<T extends string> {
  tabs: readonly { value: T; label: string; width?: string }[];
  value: T;
  onChange: (value: T) => void;
}

function SegmentedControl<T extends string>({ tabs, value, onChange }: SegmentedControlProps<T>) {
  const { root, tab } = segmentedControl();

  return (
    <div className={root()}>
      {tabs.map((t) => (
        <button
          key={t.value}
          type="button"
          onClick={() => onChange(t.value)}
          style={t.width ? { width: t.width } : { width: "72px" }}
          className={tab({ active: value === t.value })}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

export { SegmentedControl };
