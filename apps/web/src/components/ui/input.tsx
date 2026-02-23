import { useState } from "react";

import { tv } from "tailwind-variants";

const inputVariants = tv({
  slots: {
    wrapper: "flex h-9 w-full items-center gap-2 rounded-md border bg-white px-2 transition-colors",
    field:
      "min-w-0 flex-1 bg-transparent font-rubik text-xs leading-3.5 text-body placeholder:text-ghost outline-none",
    icon: "size-4 shrink-0 text-ghost",
    action: "size-4 shrink-0 text-ghost transition-colors hover:text-body",
  },
  variants: {
    error: {
      true: { wrapper: "border-red/50" },
      false: { wrapper: "border-field-line" },
    },
  },
  defaultVariants: {
    error: false,
  },
});

interface InputProps {
  id?: string;
  name?: string;
  type?: "text" | "password" | "email" | "number";
  value?: string;
  placeholder?: string;
  leadingIcon?: React.ReactNode;
  error?: boolean;
  onBlur?: () => void;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

function Input({
  id,
  name,
  type = "text",
  value,
  placeholder,
  leadingIcon,
  error = false,
  onBlur,
  onChange,
}: InputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";
  const inputType = isPassword ? (showPassword ? "text" : "password") : type;
  const { wrapper, field, icon, action } = inputVariants({ error });

  return (
    <div className={wrapper()}>
      {leadingIcon && <span className={icon()}>{leadingIcon}</span>}
      <input
        id={id}
        name={name}
        type={inputType}
        value={value}
        placeholder={placeholder}
        onBlur={onBlur}
        onChange={onChange}
        className={field()}
      />
      {isPassword && (
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setShowPassword((s) => !s)}
          className={action()}
        >
          {showPassword ? (
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="size-4"
            >
              <path
                d="M2 2l12 12M6.5 6.55A2 2 0 0 0 9.45 9.5M8 3.5C4.5 3.5 1.5 8 1.5 8s1 1.8 3 3M14.5 8s-1.5-4.5-6.5-4.5"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              className="size-4"
            >
              <path d="M1.5 8s2.5-5 6.5-5 6.5 5 6.5 5-2.5 5-6.5 5-6.5-5-6.5-5Z" />
              <circle cx="8" cy="8" r="2" />
            </svg>
          )}
        </button>
      )}
      {error && !isPassword && (
        <span className={action({ class: "text-red" })}>
          <svg
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="size-4"
          >
            <circle cx="8" cy="8" r="6.5" />
            <path d="M8 5v3.5M8 11h.01" strokeLinecap="round" />
          </svg>
        </span>
      )}
    </div>
  );
}

export { Input };
