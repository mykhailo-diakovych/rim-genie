import { renderToBuffer } from "@react-pdf/renderer";

import { InvoiceDocument } from "./invoice-document";
import type { InvoiceData } from "./invoice-document";

export type { InvoiceData };

export async function renderInvoicePdf(data: InvoiceData): Promise<Buffer> {
  return renderToBuffer(<InvoiceDocument data={data} />);
}
