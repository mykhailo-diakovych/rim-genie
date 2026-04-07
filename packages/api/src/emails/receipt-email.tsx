import type { ReactElement } from "react";
import { EmailLayout, styles } from "./email-layout";
import { formatCents } from "../lib/format-currency";

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
  baseUrl: string;
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

const thStyle = {
  padding: "10px 12px",
  fontSize: "12px",
  color: "#6b7280",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  fontWeight: 600,
} as const;

const tdStyle = {
  padding: "10px 12px",
  fontSize: "14px",
} as const;

function ReceiptEmail({
  baseUrl,
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
    <EmailLayout baseUrl={baseUrl}>
      <p style={styles.greeting}>Hi {customerName},</p>
      <p style={styles.subtitle}>Here is your payment receipt for Invoice #{invoiceNumber}.</p>

      <div style={styles.card}>
        <div style={styles.cardHeader}>Items</div>
        <table
          style={{ width: "100%", borderCollapse: "collapse" }}
          cellPadding={0}
          cellSpacing={0}
        >
          <thead>
            <tr style={{ borderBottom: "1px solid #e5e7eb", textAlign: "left" }}>
              <th style={thStyle}>Item</th>
              <th style={thStyle}>Qty</th>
              <th style={{ ...thStyle, textAlign: "right" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={tdStyle}>{item.description ?? "Rim Job"}</td>
                <td style={tdStyle}>{item.quantity}</td>
                <td style={{ ...tdStyle, textAlign: "right" }}>
                  {formatCents(item.quantity * item.unitCost)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={styles.cardBody}>
          <div style={styles.row}>
            <span>Subtotal</span>
            <span>{formatCents(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div style={styles.row}>
              <span>Discount</span>
              <span>-{formatCents(discount)}</span>
            </div>
          )}
          {tax > 0 && (
            <div style={styles.row}>
              <span>Tax</span>
              <span>+{formatCents(tax)}</span>
            </div>
          )}
        </div>
        <div style={styles.totalRow}>
          <span>Total</span>
          <span>{formatCents(total)}</span>
        </div>
      </div>

      {payments.length > 0 && (
        <div style={styles.card}>
          <div style={styles.cardHeader}>Payments</div>
          <div style={styles.cardBody}>
            {payments.map((p, i) => (
              <div key={i} style={styles.row}>
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
            <div style={{ ...styles.row, fontWeight: 600 }}>
              <span>Total Paid</span>
              <span>{formatCents(totalPaid)}</span>
            </div>
            <div style={{ ...styles.row, borderBottom: "none", fontWeight: 600 }}>
              <span>Balance Due</span>
              <span>{formatCents(balance)}</span>
            </div>
          </div>
        </div>
      )}

      <p style={styles.muted}>
        Rims left in Rim Genie beyond 30 days will attract a storage fee of $500 daily.
      </p>
    </EmailLayout>
  );
}
