import type { ReactElement } from "react";
import { EmailLayout, Row, styles } from "./email-layout";

export type StaffInviteEmailProps = {
  name: string;
  employeeId: string;
  roleLabel: string;
  inviteUrl: string;
  expiresInDays: number;
};

export function createStaffInviteEmail(props: StaffInviteEmailProps): ReactElement {
  return <StaffInviteEmail {...props} />;
}

function StaffInviteEmail({
  name,
  employeeId,
  roleLabel,
  inviteUrl,
  expiresInDays,
}: StaffInviteEmailProps): ReactElement {
  return (
    <EmailLayout>
      <p style={styles.greeting}>Hi {name},</p>
      <p style={styles.subtitle}>
        An account has been created for you at Rim Genie. Choose your own 4-digit PIN to finish
        setting it up — you will use it with your Employee ID to sign in.
      </p>

      <div style={styles.card}>
        <div style={styles.cardHeader}>Your Account</div>
        <div style={styles.cardBody}>
          <Row label="Employee ID" value={<strong>{employeeId}</strong>} />
          <Row label="Role" value={roleLabel} noBorder />
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
                href={inviteUrl}
                style={{
                  color: "#ffffff",
                  fontSize: "14px",
                  fontWeight: 600,
                  textDecoration: "none",
                  display: "inline-block",
                }}
              >
                Set my PIN
              </a>
            </td>
          </tr>
        </tbody>
      </table>

      <p style={{ margin: "0 0 8px 0", fontSize: "13px", color: "#4b5563" }}>
        If the button does not work, paste this link into your browser:
      </p>
      <p style={{ margin: "0 0 16px 0", fontSize: "12px", wordBreak: "break-all" }}>
        <a href={inviteUrl} style={{ color: "#2563eb" }}>
          {inviteUrl}
        </a>
      </p>

      <p style={styles.muted}>
        This link expires in {expiresInDays} days. If it does, ask an administrator to send a new
        one. Never share your PIN with anyone.
      </p>
    </EmailLayout>
  );
}
