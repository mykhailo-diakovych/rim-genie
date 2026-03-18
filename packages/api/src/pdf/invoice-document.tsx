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
  logo: {
    width: 80,
    height: 32,
    objectFit: "contain",
  },
  title: {
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
  customerName: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a1a",
  },
  customerDetail: {
    fontSize: 10,
    color: "#1a1a1a",
  },
  totalDisplay: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a1a",
    marginBottom: 2,
  },
  totalDisplayLabel: {
    fontSize: 10,
    color: "#1a1a1a",
    marginBottom: 2,
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
  itemComments: {
    fontSize: 9,
    color: "#888",
    marginTop: 2,
  },
  // Notes
  notesLabel: {
    fontSize: 9,
    color: "#888",
    marginBottom: 3,
  },
  notesText: {
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
  // Totals
  totalsBlock: {
    alignSelf: "flex-end",
    width: 220,
    marginBottom: 12,
  },
  subtotalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 2,
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
    marginBottom: 2,
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
  // Payment history
  paymentTitle: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: "#1a1a1a",
    marginBottom: 6,
  },
  payColDate: { width: 80 },
  payColMethod: { width: 80 },
  payColAmount: { width: 64, textAlign: "right" },
  payColRef: { flex: 1 },
  payColReceived: { width: 80, textAlign: "right" },
  // Storage fee notice
  noticeBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ebf5ff",
    borderRadius: 4,
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 8,
    marginTop: 12,
  },
  noticeText: {
    fontSize: 9,
    color: "#1a1a1a",
    flex: 1,
  },
  noticeBold: {
    fontFamily: "Helvetica-Bold",
  },
});

export type InvoiceData = {
  invoiceNumber: number;
  createdAt: Date | string | null;
  customer: { name: string; phone: string | null } | null;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  notes: string | null;
  items: Array<{
    id: string;
    description: string | null;
    comments: string | null;
    quantity: number;
    unitCost: number;
  }>;
  excludedServices: Array<{
    id: string;
    name: string;
    price: number;
  }>;
  payments: Array<{
    id: string;
    createdAt: Date | string | null;
    mode: string;
    amount: number;
    reference: string | null;
    receivedByName: string | null;
  }>;
};

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

const paymentModeLabels: Record<string, string> = {
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

export function InvoiceDocument({ data }: { data: InvoiceData }) {
  const logoPath = resolveLogoPath();
  const totalPaid = data.payments.reduce((sum, p) => sum + p.amount, 0);
  const balance = data.total - totalPaid;

  return (
    <Document title={`Invoice #${data.invoiceNumber}`}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Image src={logoPath} style={styles.logo} />
          <Text style={styles.title}>Invoice</Text>
        </View>

        <View style={styles.divider} />

        {/* Meta: Invoice # + Date | Invoice to: customer */}
        <View style={styles.metaRow}>
          <View style={{ flexDirection: "row", gap: 24 }}>
            <View style={styles.metaBlock}>
              <Text style={styles.metaLabel}>Invoice #:</Text>
              <Text style={styles.metaValue}>{data.invoiceNumber}</Text>
            </View>
            <View style={styles.metaBlock}>
              <Text style={styles.metaLabel}>Date:</Text>
              <Text style={styles.metaValue}>{fmtDate(data.createdAt)}</Text>
            </View>
          </View>
          {data.customer && (
            <View style={{ alignItems: "flex-end" }}>
              <Text style={styles.metaLabel}>Invoice to:</Text>
              <Text style={styles.customerName}>{data.customer.name}</Text>
              {data.customer.phone && (
                <Text style={styles.customerDetail}>{data.customer.phone}</Text>
              )}
            </View>
          )}
        </View>

        <View style={styles.divider} />

        {/* Total display + Business address */}
        <View style={styles.metaRow}>
          <View style={styles.metaBlock}>
            <Text style={styles.totalDisplayLabel}>Total:</Text>
            <Text style={styles.totalDisplay}>{fmtMoney(data.total)}</Text>
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

          {data.items.map((item, idx) => (
            <View style={styles.tableRow} key={item.id}>
              <Text style={[styles.cell, styles.colNum]}>{idx + 1}</Text>
              <View style={styles.colDesc}>
                <Text style={styles.cell}>{item.description ?? "Rim Job"}</Text>
                {item.comments && (
                  <Text style={styles.itemComments}>Comments: {item.comments}</Text>
                )}
              </View>
              <Text style={[styles.cell, styles.colQty]}>{item.quantity}</Text>
              <Text style={[styles.cell, styles.colUnit]}>{fmtMoney(item.unitCost)}</Text>
              <Text style={[styles.cell, styles.colTotal]}>
                {fmtMoney(item.quantity * item.unitCost)}
              </Text>
            </View>
          ))}
        </View>

        {/* Notes */}
        {data.notes && (
          <View>
            <Text style={styles.notesLabel}>Comments:</Text>
            <Text style={styles.notesText}>{data.notes}</Text>
          </View>
        )}

        {/* Excluded Services */}
        {data.excludedServices.length > 0 && (
          <View style={{ marginBottom: 12 }}>
            <Text style={styles.excludedTitle}>Services Excluded:</Text>
            <Text style={styles.excludedSubtitle}>
              The following services were offered as part of our assessment and were declined by the
              client
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
                    style={[styles.excludedColName, { flexDirection: "row", alignItems: "center" }]}
                  >
                    <Text style={styles.notIncludedBadge}>NOT INCLUDED</Text>
                    <Text style={styles.cell}>{svc.name}</Text>
                  </View>
                  <Text style={[styles.cell, styles.excludedColCost]}>{fmtMoney(svc.price)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.divider} />

        {/* Totals */}
        <View style={styles.totalsBlock}>
          <View style={styles.subtotalRow}>
            <Text style={styles.subtotalLabel}>Subtotal:</Text>
            <Text style={styles.subtotalValue}>{fmtMoney(data.subtotal)}</Text>
          </View>
          {data.discount > 0 && (
            <View style={styles.subtotalRow}>
              <Text style={styles.subtotalLabel}>Discount:</Text>
              <Text style={styles.subtotalValue}>-{fmtMoney(data.discount)}</Text>
            </View>
          )}
          {data.tax > 0 && (
            <View style={styles.subtotalRow}>
              <Text style={styles.subtotalLabel}>Tax:</Text>
              <Text style={styles.subtotalValue}>+{fmtMoney(data.tax)}</Text>
            </View>
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total:</Text>
            <Text style={styles.totalValue}>{fmtMoney(data.total)}</Text>
          </View>
          {totalPaid > 0 && (
            <View style={styles.subtotalRow}>
              <Text style={styles.subtotalLabel}>Paid:</Text>
              <Text style={styles.subtotalValue}>{fmtMoney(totalPaid)}</Text>
            </View>
          )}
          <View style={styles.subtotalRow}>
            <Text style={styles.subtotalLabel}>Balance Due:</Text>
            <Text style={[styles.subtotalValue, { fontFamily: "Helvetica-Bold" }]}>
              {fmtMoney(balance)}
            </Text>
          </View>
        </View>

        {/* Payment History */}
        {data.payments.length > 0 && (
          <View style={{ marginBottom: 12 }}>
            <Text style={styles.paymentTitle}>Payment History</Text>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={[styles.headerCell, styles.payColDate]}>Date</Text>
                <Text style={[styles.headerCell, styles.payColMethod]}>Method</Text>
                <Text style={[styles.headerCell, styles.payColAmount]}>Amount</Text>
                <Text style={[styles.headerCell, styles.payColRef]}>Reference</Text>
                <Text style={[styles.headerCell, styles.payColReceived]}>Received By</Text>
              </View>
              {data.payments.map((p) => (
                <View style={styles.tableRow} key={p.id}>
                  <Text style={[styles.cell, styles.payColDate]}>{fmtDate(p.createdAt)}</Text>
                  <Text style={[styles.cell, styles.payColMethod]}>
                    {paymentModeLabels[p.mode] ?? p.mode}
                  </Text>
                  <Text style={[styles.cell, styles.payColAmount]}>{fmtMoney(p.amount)}</Text>
                  <Text style={[styles.cell, styles.payColRef]}>{p.reference ?? "—"}</Text>
                  <Text style={[styles.cell, styles.payColReceived]}>
                    {p.receivedByName ?? "—"}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Storage fee notice */}
        <View style={styles.noticeBox}>
          <Text style={styles.noticeText}>
            Rims left in Rim Genie beyond 30 days will attract a storage fee of{" "}
            <Text style={styles.noticeBold}>$500 daily</Text>
          </Text>
        </View>
      </Page>
    </Document>
  );
}
