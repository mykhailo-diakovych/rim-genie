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

const footer = {
  padding: "16px 24px",
  backgroundColor: "#f9fafb",
  fontSize: "12px",
  color: "#6b7280",
  textAlign: "center",
} as const;

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
    <div style={container}>
      <div style={header}>
        <h1 style={headerText}>Rim Genie</h1>
      </div>
      <div style={body}>
        <p style={{ fontSize: "16px", marginBottom: "16px" }}>Hi {customerName},</p>
        <p style={{ marginBottom: "16px" }}>
          Great news! Your rim repair is complete and ready for pickup.
        </p>

        <div
          style={{
            backgroundColor: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "8px",
            padding: "16px",
            marginBottom: "24px",
          }}
        >
          <p style={{ margin: "0 0 8px 0", fontWeight: 600 }}>Job Details</p>
          <p style={{ margin: "0 0 4px 0", fontSize: "14px" }}>Invoice #{invoiceNumber}</p>
          <p style={{ margin: 0, fontSize: "14px" }}>{jobDescription}</p>
        </div>

        <p style={{ marginBottom: "8px", fontWeight: 600 }}>Pickup Instructions</p>
        <p style={{ margin: "0 0 4px 0", fontSize: "14px" }}>
          Please visit us at 82c Waltham Park Rd, Kingston, Jamaica to collect your rim.
        </p>
        <p style={{ margin: 0, fontSize: "14px" }}>
          Our hours are Monday–Saturday, 8:00 AM – 5:00 PM.
        </p>

        <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "24px" }}>
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
