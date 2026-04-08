import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import path from "path";
import { formatCents } from "../lib/format-currency";

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
  customerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
  customerDetail: {
    fontSize: 10,
    color: "#1a1a1a",
  },
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
  itemComments: {
    fontSize: 9,
    color: "#888",
    marginTop: 2,
  },
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
  // Excluded services
  excludedTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a1a",
    marginBottom: 2,
  },
  excludedSubtitle: {
    fontSize: 9,
    color: "#888",
    marginBottom: 6,
  },
  excludedColNum: { width: 28 },
  excludedColName: { flex: 1 },
  excludedColCost: { width: 64, textAlign: "right" },
  notIncludedBadge: {
    fontSize: 7,
    color: "#fff",
    backgroundColor: "#999",
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginRight: 4,
  },
  // Share quote
  shareLabel: {
    fontSize: 9,
    color: "#888",
    marginBottom: 3,
  },
  shareValue: {
    fontSize: 10,
    color: "#1a1a1a",
    marginBottom: 2,
  },
  // Totals
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: 4,
  },
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
    backgroundColor: "#21b84e",
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
  customerReason: string | null;
  fullDiagnosticConsent: boolean;
  customer: { name: string; phone: string | null; email: string | null } | null;
  comments: string | null;
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  total: number;
  items: Array<{
    id: string;
    description: string | null;
    comments: string | null;
    quantity: number;
    unitCost: number;
    inches: number | null;
  }>;
  excludedServices: Array<{
    id: string;
    name: string;
    price: number;
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

// ─── Logo path (resolved relative to CWD at render time) ─────────────────────

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

// ─── Document ─────────────────────────────────────────────────────────────────

export function QuoteDocument({ data }: { data: QuoteData }) {
  const logoPath = resolveLogoPath();

  return (
    <Document title={`Quote #${data.quoteNumber}`}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image src={logoPath} style={styles.logo} />
          <Text style={styles.quoteTitle}>Quote #{data.quoteNumber}</Text>
        </View>

        <View style={styles.divider} />

        {/* Reason for visit + Customer info */}
        {data.customer && (
          <View style={styles.customerRow}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
              <Text style={styles.metaLabel}>Reason for visit:</Text>
              <Text style={styles.metaValue}>{data.customerReason || "—"}</Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.customerName}>{data.customer.name}</Text>
              {data.customer.phone && (
                <Text style={styles.customerDetail}>{data.customer.phone}</Text>
              )}
            </View>
          </View>
        )}

        <View style={styles.divider} />

        {/* Meta: Dates + Address */}
        <View style={styles.metaRow}>
          <View style={{ flexDirection: "row", gap: 24 }}>
            <View style={styles.metaBlock}>
              <Text style={styles.metaLabel}>Quote Date</Text>
              <Text style={styles.metaValue}>{fmtDate(data.createdAt)}</Text>
            </View>
          </View>
          <View style={styles.addressBlock}>
            <Text style={styles.addressLine}>82c Waltham Park Rd,</Text>
            <Text style={styles.addressLine}>Kingston, Jamaica</Text>
            <Text style={styles.addressLine}>876-830-9624</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Items table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.headerCell, styles.colNum]}>#</Text>
            <Text style={[styles.headerCell, styles.colDesc]}>Description</Text>
            <Text style={[styles.headerCell, styles.colQty]}>Qty</Text>
            <Text style={[styles.headerCell, styles.colUnit]}>Unit Cost</Text>
            <Text style={[styles.headerCell, styles.colTotal]}>Total</Text>
          </View>

          {/* Full Diagnostic Consent row */}
          <View style={styles.tableRow}>
            <Text style={[styles.cell, styles.colNum]}>1</Text>
            <View style={styles.colDesc}>
              <Text style={styles.cell}>Full Diagnostic Service</Text>
              <Text style={styles.itemComments}>
                Comments: {data.fullDiagnosticConsent ? "Agree" : "Disagree"}
              </Text>
            </View>
            <Text style={[styles.cell, styles.colQty]}>—</Text>
            <Text style={[styles.cell, styles.colUnit]}>$0.00</Text>
            <Text style={[styles.cell, styles.colTotal]}>$0.00</Text>
          </View>

          {/* Item rows */}
          {data.items.map((item, idx) => {
            const rowTotal = item.inches
              ? item.inches * item.unitCost
              : item.quantity * item.unitCost;
            return (
              <View style={styles.tableRow} key={item.id}>
                <Text style={[styles.cell, styles.colNum]}>{idx + 2}</Text>
                <View style={styles.colDesc}>
                  <Text style={styles.cell}>{item.description ?? "Rim Job"}</Text>
                  {item.comments && (
                    <Text style={styles.itemComments}>Comments: {item.comments}</Text>
                  )}
                </View>
                <Text style={[styles.cell, styles.colQty]}>
                  {item.inches ? `${item.inches}"` : item.quantity}
                </Text>
                <Text style={[styles.cell, styles.colUnit]}>{formatCents(item.unitCost)}</Text>
                <Text style={[styles.cell, styles.colTotal]}>{formatCents(rowTotal)}</Text>
              </View>
            );
          })}
        </View>

        {/* Excluded Services */}
        {data.excludedServices.length > 0 && (
          <View style={{ marginBottom: 12 }}>
            <Text style={styles.excludedTitle}>Services Excluded:</Text>
            <Text style={styles.excludedSubtitle}>
              The following services were offered as part of our assessment and were declined by the
              customer
            </Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.headerCell, styles.excludedColNum]}>#</Text>
                <Text style={[styles.headerCell, styles.excludedColName]}>Service name</Text>
                <Text style={[styles.headerCell, styles.excludedColCost]}>Cost</Text>
              </View>
              {data.excludedServices.map((svc, idx) => (
                <View style={styles.tableRow} key={svc.id}>
                  <Text style={[styles.cell, styles.excludedColNum]}>{idx + 1}</Text>
                  <View
                    style={[
                      styles.excludedColName,
                      { flexDirection: "row", alignItems: "flex-start", flexWrap: "wrap" },
                    ]}
                  >
                    <Text style={[styles.notIncludedBadge, { marginTop: 1 }]}>NOT INCLUDED</Text>
                    <Text style={[styles.cell, { flex: 1 }]}>{svc.name}</Text>
                  </View>
                  <Text style={[styles.cell, styles.excludedColCost]}>
                    {formatCents(svc.price)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Comments */}
        {data.comments && (
          <View>
            <Text style={styles.commentsLabel}>Comments</Text>
            <Text style={styles.commentsText}>{data.comments}</Text>
          </View>
        )}

        {/* Footer: Share Quote + Totals */}
        <View style={styles.footerRow}>
          {/* Share Quote */}
          <View>
            <Text style={styles.shareLabel}>Share Quote:</Text>
            {data.customer?.email && <Text style={styles.shareValue}>{data.customer.email}</Text>}
            {data.customer?.phone && <Text style={styles.shareValue}>{data.customer.phone}</Text>}
          </View>

          {/* Totals */}
          <View style={styles.totalsBlock}>
            <View style={styles.subtotalRow}>
              <Text style={styles.subtotalLabel}>Subtotal:</Text>
              <Text style={styles.subtotalValue}>{formatCents(data.subtotal)}</Text>
            </View>
            {data.discountPercent > 0 && (
              <View style={styles.subtotalRow}>
                <Text style={styles.subtotalLabel}>Discount ({data.discountPercent}%):</Text>
                <Text style={styles.subtotalValue}>-{formatCents(data.discountAmount)}</Text>
              </View>
            )}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total:</Text>
              <Text style={styles.totalValue}>{formatCents(data.total)}</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
