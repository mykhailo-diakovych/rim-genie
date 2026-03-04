import type { ReactElement } from "react";

const container = {
  maxWidth: "600px",
  margin: "0 auto",
  fontFamily: "'Rubik', Arial, sans-serif",
  color: "#1a1a1a",
} as const;

const header = {
  backgroundColor: "#16a34a",
  padding: "24px",
  textAlign: "center",
} as const;

const headerText = {
  color: "#ffffff",
  fontSize: "22px",
  fontWeight: 600,
  margin: 0,
} as const;

const body = {
  padding: "24px",
  backgroundColor: "#ffffff",
} as const;

const row = {
  display: "flex",
  justifyContent: "space-between",
  padding: "8px 0",
  borderBottom: "1px solid #e5e7eb",
} as const;

const totalRow = {
  display: "flex",
  justifyContent: "space-between",
  padding: "12px 0",
  fontSize: "18px",
  fontWeight: 600,
} as const;

const footer = {
  padding: "16px 24px",
  backgroundColor: "#f9fafb",
  fontSize: "12px",
  color: "#6b7280",
  textAlign: "center",
} as const;

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export type QuoteEmailProps = {
  customerName: string;
  quoteNumber: number;
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  total: number;
  hasAttachment: boolean;
};

export function createQuoteEmail(props: QuoteEmailProps): ReactElement {
  return <QuoteEmail {...props} />;
}

function QuoteEmail({
  customerName,
  quoteNumber,
  subtotal,
  discountPercent,
  discountAmount,
  total,
  hasAttachment,
}: QuoteEmailProps): ReactElement {
  return (
    <div style={container}>
      <div style={header}>
        <h1 style={headerText}>Rim Genie</h1>
      </div>
      <div style={body}>
        <p style={{ fontSize: "16px", marginBottom: "16px" }}>Hi {customerName},</p>
        <p style={{ marginBottom: "24px" }}>
          Thank you for choosing Rim Genie. Please find your quote details below.
        </p>

        <div style={{ marginBottom: "24px" }}>
          <div style={row}>
            <span>Quote #</span>
            <span style={{ fontWeight: 600 }}>{quoteNumber}</span>
          </div>
          <div style={row}>
            <span>Subtotal</span>
            <span>{formatCents(subtotal)}</span>
          </div>
          {discountPercent > 0 && (
            <div style={row}>
              <span>Discount ({discountPercent}%)</span>
              <span>-{formatCents(discountAmount)}</span>
            </div>
          )}
          <div style={totalRow}>
            <span>Total</span>
            <span>{formatCents(total)}</span>
          </div>
        </div>

        {hasAttachment && (
          <p style={{ fontSize: "14px", color: "#6b7280" }}>
            A PDF copy of your quote is attached to this email.
          </p>
        )}
      </div>
      <div style={footer}>
        <p style={{ margin: 0 }}>
          Rim Genie — 82c Waltham Park Rd, Kingston, Jamaica — 876-830-9624
        </p>
      </div>
    </div>
  );
}
