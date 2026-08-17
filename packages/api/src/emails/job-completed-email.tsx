import type { ReactElement } from "react";
import { EmailLayout, Row, styles } from "./email-layout";

export type JobCompletedEmailProps = {
  customerName: string;
  jobDescription: string;
  invoiceNumber: number;
};

export function createJobCompletedEmail(props: JobCompletedEmailProps): ReactElement {
  return <JobCompletedEmail {...props} />;
}

function JobCompletedEmail({
  customerName,
  jobDescription,
  invoiceNumber,
}: JobCompletedEmailProps): ReactElement {
  return (
    <EmailLayout>
      <p style={styles.greeting}>Hi {customerName},</p>
      <p style={styles.subtitle}>Great news! Your rim repair is complete and ready for pickup.</p>

      <div
        style={{
          backgroundColor: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: "8px",
          padding: "20px",
          marginBottom: "24px",
        }}
      >
        <p style={{ margin: "0 0 12px 0", fontWeight: 600, fontSize: "15px", color: "#166534" }}>
          Job Complete
        </p>
        <Row
          label={<span style={{ color: "#4b5563" }}>Invoice #</span>}
          value={<strong>{invoiceNumber}</strong>}
          borderColor="#bbf7d0"
        />
        <Row
          label={<span style={{ color: "#4b5563" }}>Description</span>}
          value={jobDescription}
          noBorder
        />
      </div>

      <div style={styles.card}>
        <div style={styles.cardHeader}>Pickup Instructions</div>
        <div style={{ padding: "16px" }}>
          <p style={{ margin: "0 0 8px 0", fontSize: "14px" }}>
            Please visit us at <strong>82c Waltham Park Rd, Kingston, Jamaica</strong> to collect
            your rim.
          </p>
          <p style={{ margin: 0, fontSize: "14px" }}>
            Our hours are <strong>Monday–Saturday, 8:00 AM – 5:00 PM</strong>.
          </p>
        </div>
      </div>

      <p style={styles.muted}>
        Rims left in Rim Genie beyond 30 days will attract a storage fee of $500 daily.
      </p>
    </EmailLayout>
  );
}
