import { renderToBuffer } from "@react-pdf/renderer";

import { QuoteDocument } from "./quote-document";
import type { QuoteData } from "./quote-document";

export type { QuoteData };

export async function renderQuotePdf(data: QuoteData): Promise<Buffer> {
  return renderToBuffer(<QuoteDocument data={data} />);
}
