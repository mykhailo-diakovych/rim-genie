import { m } from "@/paraglide/messages";

export function AppFooter() {
  return (
    <footer className="flex h-10 shrink-0 items-center justify-center border-t border-card-line bg-white px-5">
      <p className="font-poppins text-xs leading-4.5 text-dim">{m.copyright()}</p>
    </footer>
  );
}
