import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import path from "path";

const styles = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    paddingTop: 32,
    paddingBottom: 40,
    paddingHorizontal: 36,
    backgroundColor: "#fff",
    color: "#1a1a1a",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  logo: { width: 80, height: 32, objectFit: "contain" },
  title: { fontSize: 18, fontFamily: "Helvetica-Bold", color: "#1a1a1a" },
  subtitle: { fontSize: 11, color: "#888", marginTop: 2 },
  divider: { height: 1, backgroundColor: "#e5e5e5", marginBottom: 12 },
  addressBlock: { alignItems: "flex-end", flexDirection: "column", gap: 3 },
  addressLine: { fontSize: 10, color: "#1a1a1a", textAlign: "right" },
  // Summary cards
  cardsRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  card: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 4,
    padding: 10,
  },
  cardLabel: { fontSize: 8, color: "#888", marginBottom: 4, textTransform: "uppercase" },
  cardValue: { fontSize: 16, fontFamily: "Helvetica-Bold" },
  cardSub: { fontSize: 8, color: "#888", marginTop: 3 },
  greenText: { color: "#059669" },
  blueText: { color: "#2563eb" },
  amberText: { color: "#d97706" },
  purpleText: { color: "#7c3aed" },
  // Section
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a1a",
    marginBottom: 6,
  },
  // Table
  table: { marginBottom: 12 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#e5e5e5",
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#e5e5e5",
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  totalTableRow: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  headerCell: { fontSize: 9, color: "#888", fontFamily: "Helvetica-Bold" },
  cell: { fontSize: 10, color: "#1a1a1a" },
  boldCell: { fontSize: 10, color: "#1a1a1a", fontFamily: "Helvetica-Bold" },
  // Column widths — payment table
  payColMethod: { flex: 1 },
  payColCount: { width: 60, textAlign: "right" },
  payColTotal: { width: 80, textAlign: "right" },
  // Column widths — team table
  teamColName: { flex: 1 },
  teamColActive: { width: 70, textAlign: "right" },
  teamColCompleted: { width: 70, textAlign: "right" },
  // Two-column layout
  twoCol: { flexDirection: "row", gap: 8, marginBottom: 12 },
  halfCol: { flex: 1 },
  // Stat grid
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, padding: 8 },
  statItem: { width: "46%" },
  statLabel: { fontSize: 8, color: "#888" },
  statValue: { fontSize: 11, fontFamily: "Helvetica-Bold", color: "#1a1a1a", marginTop: 2 },
  // Attention
  attentionRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  attentionItem: {
    flex: 1,
    alignItems: "center",
    borderRadius: 4,
    padding: 10,
  },
  attentionHigh: { backgroundColor: "#fef2f2" },
  attentionMedium: { backgroundColor: "#fffbeb" },
  attentionCount: { fontSize: 18, fontFamily: "Helvetica-Bold", marginBottom: 2 },
  attentionCountHigh: { color: "#dc2626" },
  attentionCountMedium: { color: "#d97706" },
  attentionLabel: { fontSize: 8, color: "#888", textAlign: "center" },
  // Footer
  footer: {
    position: "absolute",
    bottom: 20,
    left: 36,
    right: 36,
    textAlign: "center",
    fontSize: 8,
    color: "#999",
  },
  emptyText: { fontSize: 10, color: "#888", textAlign: "center", padding: 16 },
  sectionBox: {
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 4,
    overflow: "hidden",
  },
  sectionBoxTitle: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#374151",
    backgroundColor: "#f5f5f5",
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderColor: "#e5e5e5",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});

export type DailyReportData = {
  date: string;
  revenue: {
    total: number;
    paymentCount: number;
    byMode: Array<{ mode: string; total: number; count: number }>;
  };
  jobs: { completed: number; open: number; active: number; overnight: number };
  invoices: { created: number; paid: number; unpaid: number; totalBilled: number };
  teamActivity: Array<{ name: string; activeJobs: number; completedJobs: number }>;
  attentionItems: Array<{ label: string; count: number; severity: "high" | "medium" }>;
};

function fmtMoney(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

function fmtDate(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

const MODE_LABELS: Record<string, string> = {
  cash: "Cash",
  credit_card: "Credit Card",
  debit_card: "Debit Card",
  bank_transfer: "Bank Transfer",
  cheque: "Cheque",
};

function resolveLogoPath(): string {
  const candidates = [
    path.resolve(process.cwd(), "apps/web/public/logo.png"),
    path.resolve(process.cwd(), "public/logo.png"),
  ];
  for (const p of candidates) {
    try {
      const { existsSync } = require("fs") as typeof import("fs");
      if (existsSync(p)) return p;
    } catch {
      // ignore
    }
  }
  return candidates[0] ?? "";
}

export function DailyReportDocument({ data }: { data: DailyReportData }) {
  const logoPath = resolveLogoPath();

  return (
    <Document title={`Daily Report — ${fmtDate(data.date)}`}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Image src={logoPath} style={styles.logo} />
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.title}>Daily Report</Text>
            <Text style={styles.subtitle}>{fmtDate(data.date)}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Summary Cards */}
        <View style={styles.cardsRow}>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Revenue</Text>
            <Text style={[styles.cardValue, styles.greenText]}>{fmtMoney(data.revenue.total)}</Text>
            <Text style={styles.cardSub}>
              {data.revenue.paymentCount} payment{data.revenue.paymentCount !== 1 ? "s" : ""}
            </Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Completed</Text>
            <Text style={[styles.cardValue, styles.blueText]}>{data.jobs.completed}</Text>
            <Text style={styles.cardSub}>{data.jobs.active} active</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Open Jobs</Text>
            <Text style={[styles.cardValue, styles.amberText]}>{data.jobs.open}</Text>
            <Text style={styles.cardSub}>{data.invoices.created} invoices created</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.cardLabel}>Overnight</Text>
            <Text style={[styles.cardValue, styles.purpleText]}>{data.jobs.overnight}</Text>
          </View>
        </View>

        {/* Two-column: Payment Breakdown + Invoice Summary */}
        <View style={styles.twoCol}>
          {/* Payment Breakdown */}
          <View style={[styles.halfCol, styles.sectionBox]}>
            <Text style={styles.sectionBoxTitle}>Payment Breakdown</Text>
            {data.revenue.byMode.length === 0 ? (
              <Text style={styles.emptyText}>No payments recorded</Text>
            ) : (
              <View>
                <View style={styles.tableHeader}>
                  <Text style={[styles.headerCell, styles.payColMethod]}>Method</Text>
                  <Text style={[styles.headerCell, styles.payColCount]}>Count</Text>
                  <Text style={[styles.headerCell, styles.payColTotal]}>Total</Text>
                </View>
                {data.revenue.byMode.map((m) => (
                  <View style={styles.tableRow} key={m.mode}>
                    <Text style={[styles.cell, styles.payColMethod]}>
                      {MODE_LABELS[m.mode] ?? m.mode}
                    </Text>
                    <Text style={[styles.cell, styles.payColCount]}>{m.count}</Text>
                    <Text style={[styles.cell, styles.payColTotal]}>{fmtMoney(m.total)}</Text>
                  </View>
                ))}
                <View style={styles.totalTableRow}>
                  <Text style={[styles.boldCell, styles.payColMethod]}>Total</Text>
                  <Text style={[styles.boldCell, styles.payColCount]}>
                    {data.revenue.paymentCount}
                  </Text>
                  <Text style={[styles.boldCell, styles.payColTotal]}>
                    {fmtMoney(data.revenue.total)}
                  </Text>
                </View>
              </View>
            )}
          </View>

          {/* Invoice Summary */}
          <View style={[styles.halfCol, styles.sectionBox]}>
            <Text style={styles.sectionBoxTitle}>Invoice Summary</Text>
            <View style={styles.statGrid}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Created Today</Text>
                <Text style={styles.statValue}>{data.invoices.created}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Total Billed</Text>
                <Text style={styles.statValue}>{fmtMoney(data.invoices.totalBilled)}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Paid (all time)</Text>
                <Text style={styles.statValue}>{data.invoices.paid}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Unpaid (all time)</Text>
                <Text style={styles.statValue}>{data.invoices.unpaid}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Team Activity */}
        <View style={[styles.sectionBox, { marginBottom: 12 }]}>
          <Text style={styles.sectionBoxTitle}>Team Activity</Text>
          {data.teamActivity.length === 0 ? (
            <Text style={styles.emptyText}>No technicians</Text>
          ) : (
            <View>
              <View style={styles.tableHeader}>
                <Text style={[styles.headerCell, styles.teamColName]}>Technician</Text>
                <Text style={[styles.headerCell, styles.teamColActive]}>Active</Text>
                <Text style={[styles.headerCell, styles.teamColCompleted]}>Completed</Text>
              </View>
              {data.teamActivity.map((t) => (
                <View style={styles.tableRow} key={t.name}>
                  <Text style={[styles.cell, styles.teamColName]}>{t.name}</Text>
                  <Text style={[styles.cell, styles.teamColActive]}>{t.activeJobs}</Text>
                  <Text style={[styles.cell, styles.teamColCompleted]}>{t.completedJobs}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Attention Required */}
        <Text style={styles.sectionTitle}>Attention Required</Text>
        <View style={styles.attentionRow}>
          {data.attentionItems.map((item) => (
            <View
              key={item.label}
              style={[
                styles.attentionItem,
                item.severity === "high" ? styles.attentionHigh : styles.attentionMedium,
              ]}
            >
              <Text
                style={[
                  styles.attentionCount,
                  item.severity === "high"
                    ? styles.attentionCountHigh
                    : styles.attentionCountMedium,
                ]}
              >
                {item.count}
              </Text>
              <Text style={styles.attentionLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          Rim Genie — 82c Waltham Park Rd, Kingston, Jamaica — 876-830-9624
        </Text>
      </Page>
    </Document>
  );
}
