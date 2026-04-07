import type { ReactElement } from "react";
import { EmailLayout, styles } from "./email-layout";
import { formatCents } from "../lib/format-currency";

export type QuoteEmailProps = {
  baseUrl: string;
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
  baseUrl,
  customerName,
  quoteNumber,
  subtotal,
  discountPercent,
  discountAmount,
  total,
  hasAttachment,
}: QuoteEmailProps): ReactElement {
  return (
    <EmailLayout baseUrl={baseUrl}>
      <p style={styles.greeting}>Hi {customerName},</p>
      <p style={styles.subtitle}>
        Thank you for choosing Rim Genie. Please find your quote details below.
      </p>

      <div style={styles.card}>
        <div style={styles.cardHeader}>Quote Summary</div>
        <div style={styles.cardBody}>
          <div style={styles.row}>
            <span>Quote #</span>
            <span style={{ fontWeight: 600 }}>{quoteNumber}</span>
          </div>
          <div style={styles.row}>
            <span>Subtotal</span>
            <span>{formatCents(subtotal)}</span>
          </div>
          {discountPercent > 0 && (
            <div style={styles.row}>
              <span>Discount ({discountPercent}%)</span>
              <span>-{formatCents(discountAmount)}</span>
            </div>
          )}
        </div>
        <div style={styles.totalRow}>
          <span>Total</span>
          <span>{formatCents(total)}</span>
        </div>
      </div>

      {hasAttachment && (
        <p style={styles.muted}>A PDF copy of your quote is attached to this email.</p>
      )}
    </EmailLayout>
  );
}
