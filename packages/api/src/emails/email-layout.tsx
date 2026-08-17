import type { CSSProperties, ReactElement, ReactNode } from "react";

const BRAND_GREEN = "#21b84e";

/**
 * Referenced from the HTML as `cid:` and attached inline by the email service, so
 * the logo travels with the message. It used to be `<img src="{baseUrl}/logo.png">`,
 * which breaks whenever `BETTER_AUTH_URL` is not publicly reachable — in local
 * development that is `http://localhost:3000`, which no mail client can fetch.
 */
export const LOGO_CID = "rimgenie-logo";

const outerWrapper = {
  backgroundColor: "#f4f4f5",
  padding: "40px 0",
  fontFamily: "'Rubik', Arial, sans-serif",
} as const;

const container = {
  maxWidth: "600px",
  margin: "0 auto",
  backgroundColor: "#ffffff",
  borderRadius: "8px",
  overflow: "hidden",
} as const;

const headerBar = {
  backgroundColor: BRAND_GREEN,
  padding: "24px 32px",
  textAlign: "center",
} as const;

const logoImg = {
  maxHeight: "40px",
  display: "inline-block",
  border: "0",
} as const;

const bodySection = {
  padding: "40px 32px",
  color: "#1a1a1a",
  fontSize: "14px",
  lineHeight: "1.6",
} as const;

const footerSection = {
  padding: "24px 32px",
  backgroundColor: "#f9fafb",
  fontSize: "12px",
  color: "#9ca3af",
  textAlign: "center",
  lineHeight: "1.5",
} as const;

type EmailLayoutProps = {
  children: ReactNode;
};

export function EmailLayout({ children }: EmailLayoutProps): ReactElement {
  return (
    <div style={outerWrapper}>
      <div style={container}>
        <div style={headerBar}>
          <img src={`cid:${LOGO_CID}`} alt="Rim Genie" width="120" style={logoImg} />
        </div>
        <div style={bodySection}>{children}</div>
        <div style={footerSection}>
          <p style={{ margin: "0 0 4px 0", fontWeight: 500 }}>Rim Genie</p>
          <p style={{ margin: "0 0 2px 0" }}>82c Waltham Park Rd, Kingston, Jamaica</p>
          <p style={{ margin: 0 }}>876-830-9624</p>
        </div>
      </div>
    </div>
  );
}

// ─── Rows ─────────────────────────────────────────────────────────────────────
// Label-left / value-right, laid out with a table rather than flexbox. Gmail
// strips `display:flex`, which collapsed the two spans together and rendered
// "Subtotal$2,800.00" with no separation.

const cellBase: CSSProperties = {
  fontSize: "14px",
  padding: "12px 0",
  verticalAlign: "top",
};

export function Row({
  label,
  value,
  bold,
  noBorder,
  borderColor = "#f3f4f6",
}: {
  label: ReactNode;
  value: ReactNode;
  bold?: boolean;
  noBorder?: boolean;
  borderColor?: string;
}): ReactElement {
  const border = noBorder ? "none" : `1px solid ${borderColor}`;
  const weight = bold ? 600 : undefined;
  return (
    <table
      role="presentation"
      width="100%"
      cellPadding={0}
      cellSpacing={0}
      style={{ width: "100%", borderCollapse: "collapse" }}
    >
      <tbody>
        <tr>
          <td style={{ ...cellBase, textAlign: "left", borderBottom: border, fontWeight: weight }}>
            {label}
          </td>
          <td
            style={{
              ...cellBase,
              textAlign: "right",
              borderBottom: border,
              fontWeight: weight,
              whiteSpace: "nowrap",
              paddingLeft: "16px",
            }}
          >
            {value}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

export function TotalRow({
  label,
  value,
  background = BRAND_GREEN,
}: {
  label: ReactNode;
  value: ReactNode;
  background?: string;
}): ReactElement {
  return (
    <table
      role="presentation"
      width="100%"
      cellPadding={0}
      cellSpacing={0}
      style={{
        width: "100%",
        borderCollapse: "collapse",
        backgroundColor: background,
        borderRadius: "0 0 8px 8px",
      }}
    >
      <tbody>
        <tr>
          <td
            style={{
              padding: "12px 16px",
              fontSize: "16px",
              fontWeight: 600,
              color: "#ffffff",
              textAlign: "left",
            }}
          >
            {label}
          </td>
          <td
            style={{
              padding: "12px 16px",
              fontSize: "16px",
              fontWeight: 600,
              color: "#ffffff",
              textAlign: "right",
              whiteSpace: "nowrap",
            }}
          >
            {value}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

export const styles = {
  greeting: {
    fontSize: "18px",
    marginBottom: "8px",
    fontWeight: 500,
    color: "#1a1a1a",
  },
  subtitle: {
    marginBottom: "24px",
    color: "#4b5563",
    fontSize: "14px",
  },
  card: {
    border: "1px solid #e5e7eb",
    borderRadius: "8px",
    overflow: "hidden",
    marginBottom: "24px",
  },
  cardHeader: {
    backgroundColor: "#f9fafb",
    padding: "12px 16px",
    fontSize: "13px",
    fontWeight: 600,
    color: "#374151",
    borderBottom: "1px solid #e5e7eb",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  cardBody: {
    padding: "0 16px",
  },
  muted: {
    fontSize: "12px",
    color: "#9ca3af",
    marginTop: "16px",
  },
} as const;
