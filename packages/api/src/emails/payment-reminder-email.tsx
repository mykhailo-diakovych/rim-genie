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

export type PaymentReminderEmailProps = {
  customerName: string;
  invoiceNumber: number;
  total: number;
  balance: number;
};

export function createPaymentReminderEmail(props: PaymentReminderEmailProps): ReactElement {
  return <PaymentReminderEmail {...props} />;
}

function PaymentReminderEmail({
  customerName,
  invoiceNumber,
  total,
  balance,
}: PaymentReminderEmailProps): ReactElement {
  return (
    <div style={container}>
      <div style={header}>
        <h1 style={headerText}>Rim Genie</h1>
      </div>
      <div style={body}>
        <p style={{ fontSize: "16px", marginBottom: "16px" }}>Hi {customerName},</p>
        <p style={{ marginBottom: "24px" }}>
          This is a friendly reminder that you have an outstanding balance on your invoice.
        </p>

        <div style={{ marginBottom: "24px" }}>
          <div style={row}>
            <span>Invoice #</span>
            <span style={{ fontWeight: 600 }}>{invoiceNumber}</span>
          </div>
          <div style={row}>
            <span>Total</span>
            <span>{formatCents(total)}</span>
          </div>
          <div style={{ ...row, fontSize: "18px", fontWeight: 600, borderBottom: "none" }}>
            <span>Balance Due</span>
            <span>{formatCents(balance)}</span>
          </div>
        </div>

        <p style={{ marginBottom: "8px" }}>
          Please visit us at your earliest convenience to settle your balance.
        </p>
        <p style={{ margin: 0, fontSize: "14px" }}>
          82c Waltham Park Rd, Kingston, Jamaica — 876-830-9624
        </p>
      </div>
      <div style={footer}>
        <p style={{ margin: 0 }}>
          Rim Genie — 82c Waltham Park Rd, Kingston, Jamaica — 876-830-9624
        </p>
      </div>
    </div>
  );
}
