import type { ReactElement } from "react";
import { EmailLayout, Row, TotalRow, styles } from "./email-layout";
import { formatCents } from "../lib/format-currency";

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
    <EmailLayout>
      <p style={styles.greeting}>Hi {customerName},</p>
      <p style={styles.subtitle}>
        This is a friendly reminder that you have an outstanding balance on your invoice.
      </p>

      <div style={styles.card}>
        <div style={styles.cardHeader}>Invoice Details</div>
        <div style={styles.cardBody}>
          <Row label="Invoice #" value={<strong>{invoiceNumber}</strong>} />
          <Row label="Total" value={formatCents(total)} noBorder />
        </div>
        <TotalRow label="Balance Due" value={formatCents(balance)} background="#dc2626" />
      </div>

      <div
        style={{
          backgroundColor: "#fef2f2",
          border: "1px solid #fecaca",
          borderRadius: "8px",
          padding: "16px",
          marginBottom: "16px",
        }}
      >
        <p style={{ margin: "0 0 8px 0", fontWeight: 600, color: "#991b1b" }}>
          Please settle your balance
        </p>
        <p style={{ margin: "0 0 4px 0", fontSize: "14px", color: "#1a1a1a" }}>
          Visit us at 82c Waltham Park Rd, Kingston, Jamaica
        </p>
        <p style={{ margin: 0, fontSize: "14px", color: "#1a1a1a" }}>Call us at 876-830-9624</p>
      </div>
    </EmailLayout>
  );
}
