import type { ReactElement, ReactNode } from "react";

const BRAND_GREEN = "#21b84e";

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
  baseUrl: string;
  children: ReactNode;
};

export function EmailLayout({ baseUrl, children }: EmailLayoutProps): ReactElement {
  return (
    <div style={outerWrapper}>
      <div style={container}>
        <div style={headerBar}>
          <img src={`${baseUrl}/logo.png`} alt="Rim Genie" style={logoImg} />
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
    padding: "4px 16px",
  },
  row: {
    display: "flex",
    justifyContent: "space-between",
    padding: "12px 0",
    borderBottom: "1px solid #f3f4f6",
    fontSize: "14px",
  },
  totalRow: {
    display: "flex",
    justifyContent: "space-between",
    padding: "12px 16px",
    fontSize: "16px",
    fontWeight: 600,
    backgroundColor: BRAND_GREEN,
    color: "#ffffff",
    borderRadius: "0 0 8px 8px",
  },
  muted: {
    fontSize: "12px",
    color: "#9ca3af",
    marginTop: "16px",
  },
} as const;
