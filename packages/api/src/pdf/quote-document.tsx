import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import path from "path";

// ─── Styles ───────────────────────────────────────────────────────────────────

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
  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  logo: {
    width: 80,
    height: 32,
    objectFit: "contain",
  },
  quoteTitle: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a1a",
  },
  divider: {
    height: 1,
    backgroundColor: "#e5e5e5",
    marginBottom: 12,
  },
  // Meta row
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  metaBlock: {
    flexDirection: "column",
    gap: 4,
  },
  metaLabel: {
    fontSize: 9,
    color: "#888",
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 10,
    color: "#1a1a1a",
  },
  addressBlock: {
    alignItems: "flex-end",
    flexDirection: "column",
    gap: 3,
  },
  addressLine: {
    fontSize: 10,
    color: "#1a1a1a",
    textAlign: "right",
  },
  // Customer
  customerRow: {
    marginBottom: 12,
  },
  customerLabel: {
    fontSize: 9,
    color: "#888",
    marginBottom: 2,
  },
  customerName: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a1a",
  },
  // Table
  table: {
    marginBottom: 12,
  },
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
  colNum: { width: 28 },
  colDesc: { flex: 1 },
  colQty: { width: 40, textAlign: "center" },
  colUnit: { width: 64, textAlign: "right" },
  colTotal: { width: 64, textAlign: "right" },
  headerCell: {
    fontSize: 9,
    color: "#888",
    fontFamily: "Helvetica-Bold",
  },
  cell: {
    fontSize: 10,
    color: "#1a1a1a",
  },
  // Comments
  commentsLabel: {
    fontSize: 9,
    color: "#888",
    marginBottom: 3,
  },
  commentsText: {
    fontSize: 10,
    color: "#1a1a1a",
    marginBottom: 12,
  },
  // Totals
  totalsBlock: {
    alignSelf: "flex-end",
    width: 200,
  },
  subtotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  subtotalLabel: {
    fontSize: 10,
    color: "#888",
  },
  subtotalValue: {
    fontSize: 10,
    color: "#1a1a1a",
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "#1ba87c",
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  totalLabel: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: "#fff",
  },
  totalValue: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: "#fff",
  },
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type QuoteData = {
  quoteNumber: number;
  createdAt: Date | string | null;
  validUntil: Date | string | null;
  customer: { name: string } | null;
  comments: string | null;
  total: number;
  items: Array<{
    id: string;
    description: string | null;
    quantity: number;
    unitCost: number;
  }>;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
}

function fmtMoney(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

// ─── Logo path (resolved relative to CWD at render time) ─────────────────────

function resolveLogoPath(): string {
  // Works both in monorepo dev (CWD = repo root) and when called from apps/web
  const candidates = [
    path.resolve(process.cwd(), "apps/web/public/logo.png"),
    path.resolve(process.cwd(), "public/logo.png"),
  ];
  for (const p of candidates) {
    try {
      // Access synchronously — PDF rendering is server-side Node
      const { existsSync } = require("fs") as typeof import("fs");
      if (existsSync(p)) return p;
    } catch {
      // ignore
    }
  }
  // Fallback: let react-pdf try anyway
  return candidates[0] ?? "";
}

// ─── Document ─────────────────────────────────────────────────────────────────

export function QuoteDocument({ data }: { data: QuoteData }) {
  const logoPath = resolveLogoPath();
  const total = data.total;
  const subtotal = total; // no tax yet

  return (
    <Document title={`Quote #${data.quoteNumber}`}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image src={logoPath} style={styles.logo} />
          <Text style={styles.quoteTitle}>Quote #{data.quoteNumber}</Text>
        </View>

        <View style={styles.divider} />

        {/* Meta: Dates + Address */}
        <View style={styles.metaRow}>
          <View style={{ flexDirection: "row", gap: 24 }}>
            <View style={styles.metaBlock}>
              <Text style={styles.metaLabel}>Quote Date</Text>
              <Text style={styles.metaValue}>{fmtDate(data.createdAt)}</Text>
            </View>
            <View style={styles.metaBlock}>
              <Text style={styles.metaLabel}>Valid Until</Text>
              <Text style={styles.metaValue}>{fmtDate(data.validUntil)}</Text>
            </View>
          </View>
          <View style={styles.addressBlock}>
            <Text style={styles.addressLine}>82c Waltham Park Rd,</Text>
            <Text style={styles.addressLine}>Kingston, Jamaica</Text>
            <Text style={styles.addressLine}>876-830-9624</Text>
          </View>
        </View>

        {/* Customer */}
        {data.customer && (
          <View style={styles.customerRow}>
            <Text style={styles.customerLabel}>Customer</Text>
            <Text style={styles.customerName}>{data.customer.name}</Text>
          </View>
        )}

        <View style={styles.divider} />

        {/* Items table */}
        <View style={styles.table}>
          {/* Table header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.headerCell, styles.colNum]}>#</Text>
            <Text style={[styles.headerCell, styles.colDesc]}>Description</Text>
            <Text style={[styles.headerCell, styles.colQty]}>Qty</Text>
            <Text style={[styles.headerCell, styles.colUnit]}>Unit Cost</Text>
            <Text style={[styles.headerCell, styles.colTotal]}>Total</Text>
          </View>

          {/* Rows */}
          {data.items.map((item, idx) => {
            const rowTotal = item.quantity * item.unitCost;
            return (
              <View style={styles.tableRow} key={item.id}>
                <Text style={[styles.cell, styles.colNum]}>{idx + 1}</Text>
                <Text style={[styles.cell, styles.colDesc]}>{item.description ?? "Rim Job"}</Text>
                <Text style={[styles.cell, styles.colQty]}>{item.quantity}</Text>
                <Text style={[styles.cell, styles.colUnit]}>{fmtMoney(item.unitCost)}</Text>
                <Text style={[styles.cell, styles.colTotal]}>{fmtMoney(rowTotal)}</Text>
              </View>
            );
          })}
        </View>

        {/* Comments */}
        {data.comments && (
          <View>
            <Text style={styles.commentsLabel}>Comments</Text>
            <Text style={styles.commentsText}>{data.comments}</Text>
          </View>
        )}

        {/* Totals */}
        <View style={styles.totalsBlock}>
          <View style={styles.subtotalRow}>
            <Text style={styles.subtotalLabel}>Subtotal:</Text>
            <Text style={styles.subtotalValue}>{fmtMoney(subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalValue}>{fmtMoney(total)}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
