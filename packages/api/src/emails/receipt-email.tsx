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

function formatPaymentMode(mode: string) {
  const map: Record<string, string> = {
    cash: "Cash",
    credit_card: "Credit Card",
    debit_card: "Debit Card",
    bank_transfer: "Bank Transfer",
    cheque: "Cheque",
  };
  return map[mode] ?? mode;
}

export type ReceiptEmailProps = {
  customerName: string;
  invoiceNumber: number;
  items: { description: string | null; quantity: number; unitCost: number }[];
  payments: { amount: number; mode: string; createdAt: Date | string }[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  totalPaid: number;
  balance: number;
};

export function createReceiptEmail(props: ReceiptEmailProps): ReactElement {
  return <ReceiptEmail {...props} />;
}

function ReceiptEmail({
  customerName,
  invoiceNumber,
  items,
  payments,
  subtotal,
  discount,
  tax,
  total,
  totalPaid,
  balance,
}: ReceiptEmailProps): ReactElement {
  return (
    <div style={container}>
      <div style={header}>
        <h1 style={headerText}>Rim Genie</h1>
      </div>
      <div style={body}>
        <p style={{ fontSize: "16px", marginBottom: "16px" }}>Hi {customerName},</p>
        <p style={{ marginBottom: "24px" }}>
          Here is your payment receipt for Invoice #{invoiceNumber}.
        </p>

        <table
          style={{ width: "100%", borderCollapse: "collapse", marginBottom: "16px" }}
          cellPadding={0}
          cellSpacing={0}
        >
          <thead>
            <tr style={{ borderBottom: "2px solid #e5e7eb", textAlign: "left" }}>
              <th style={{ padding: "8px 4px", fontSize: "12px", color: "#6b7280" }}>Item</th>
              <th style={{ padding: "8px 4px", fontSize: "12px", color: "#6b7280" }}>Qty</th>
              <th
                style={{
                  padding: "8px 4px",
                  fontSize: "12px",
                  color: "#6b7280",
                  textAlign: "right",
                }}
              >
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: "8px 4px", fontSize: "14px" }}>
                  {item.description ?? "Rim Job"}
                </td>
                <td style={{ padding: "8px 4px", fontSize: "14px" }}>{item.quantity}</td>
                <td style={{ padding: "8px 4px", fontSize: "14px", textAlign: "right" }}>
                  {formatCents(item.quantity * item.unitCost)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginBottom: "24px" }}>
          <div style={row}>
            <span>Subtotal</span>
            <span>{formatCents(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div style={row}>
              <span>Discount</span>
              <span>-{formatCents(discount)}</span>
            </div>
          )}
          {tax > 0 && (
            <div style={row}>
              <span>Tax</span>
              <span>+{formatCents(tax)}</span>
            </div>
          )}
          <div style={totalRow}>
            <span>Total</span>
            <span>{formatCents(total)}</span>
          </div>
        </div>

        {payments.length > 0 && (
          <div style={{ marginBottom: "24px" }}>
            <h3 style={{ fontSize: "14px", marginBottom: "8px" }}>Payments</h3>
            {payments.map((p, i) => (
              <div key={i} style={row}>
                <span>
                  {formatPaymentMode(p.mode)} —{" "}
                  {new Date(p.createdAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "2-digit",
                    year: "numeric",
                  })}
                </span>
                <span>{formatCents(p.amount)}</span>
              </div>
            ))}
            <div style={{ ...row, fontWeight: 600 }}>
              <span>Total Paid</span>
              <span>{formatCents(totalPaid)}</span>
            </div>
            <div style={{ ...row, fontWeight: 600 }}>
              <span>Balance Due</span>
              <span>{formatCents(balance)}</span>
            </div>
          </div>
        )}

        <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "16px" }}>
          Rims left in Rim Genie beyond 30 days will attract a storage fee of $500 daily.
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
