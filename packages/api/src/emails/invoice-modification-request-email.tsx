import type { ReactElement } from "react";
import { EmailLayout, Row, styles } from "./email-layout";

export type InvoiceModificationRequestEmailProps = {
  adminName: string;
  invoiceNumber: number;
  customerName: string;
  cashierName: string;
  reason: string | null;
  requestUrl: string;
};

export function createInvoiceModificationRequestEmail(
  props: InvoiceModificationRequestEmailProps,
): ReactElement {
  return <InvoiceModificationRequestEmail {...props} />;
}

function InvoiceModificationRequestEmail({
  adminName,
  invoiceNumber,
  customerName,
  cashierName,
  reason,
  requestUrl,
}: InvoiceModificationRequestEmailProps): ReactElement {
  return (
    <EmailLayout>
      <p style={styles.greeting}>Hi {adminName},</p>
      <p style={styles.subtitle}>
        {cashierName} has requested a modification to Invoice #{invoiceNumber} and selected you to
        review it.
      </p>

      <div style={styles.card}>
        <div style={styles.cardHeader}>Request Invoice Modification</div>
        <div style={styles.cardBody}>
          <Row label="Invoice #" value={<strong>{invoiceNumber}</strong>} />
          <Row label="Customer" value={customerName} />
          <Row label="Requested by" value={cashierName} />
          <Row label="Reason for Modification" value={reason || "No reason provided"} noBorder />
        </div>
      </div>

      <table
        role="presentation"
        cellPadding={0}
        cellSpacing={0}
        style={{ margin: "0 0 24px 0", borderCollapse: "collapse" }}
      >
        <tbody>
          <tr>
            <td
              style={{
                backgroundColor: "#21b84e",
                borderRadius: "6px",
                padding: "12px 24px",
                textAlign: "center",
              }}
            >
              <a
                href={requestUrl}
                style={{
                  color: "#ffffff",
                  fontSize: "14px",
                  fontWeight: 600,
                  textDecoration: "none",
                  display: "inline-block",
                }}
              >
                View Invoice
              </a>
            </td>
          </tr>
        </tbody>
      </table>

      <p style={{ margin: "0 0 8px 0", fontSize: "13px", color: "#4b5563" }}>
        If the button does not work, paste this link into your browser:
      </p>
      <p style={{ margin: "0 0 16px 0", fontSize: "12px", wordBreak: "break-all" }}>
        <a href={requestUrl} style={{ color: "#2563eb" }}>
          {requestUrl}
        </a>
      </p>
    </EmailLayout>
  );
}
