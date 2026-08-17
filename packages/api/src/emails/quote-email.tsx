import type { ReactElement } from "react";
import { EmailLayout, Row, TotalRow, styles } from "./email-layout";
import { formatCents } from "../lib/format-currency";

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
    <EmailLayout>
      <p style={styles.greeting}>Hi {customerName},</p>
      <p style={styles.subtitle}>
        Thank you for choosing Rim Genie. Please find your quote details below.
      </p>

      <div style={styles.card}>
        <div style={styles.cardHeader}>Quote Summary</div>
        <div style={styles.cardBody}>
          <Row label="Quote #" value={<strong>{quoteNumber}</strong>} />
          <Row label="Subtotal" value={formatCents(subtotal)} noBorder={discountPercent <= 0} />
          {discountPercent > 0 && (
            <Row
              label={`Discount (${discountPercent}%)`}
              value={`-${formatCents(discountAmount)}`}
              noBorder
            />
          )}
        </div>
        <TotalRow label="Total" value={formatCents(total)} />
      </div>

      {hasAttachment && (
        <p style={styles.muted}>A PDF copy of your quote is attached to this email.</p>
      )}
    </EmailLayout>
  );
}
