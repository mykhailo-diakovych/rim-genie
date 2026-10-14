import { FilePenLine } from "lucide-react";

import { Banner } from "@/components/ui/banner";

export function SignedDisclaimerNotice() {
  return (
    <Banner icon={<FilePenLine />}>
      The customer has reviewed and accepted the service conditions for this quote. By signing, they
      acknowledge the services to be performed and agree to the terms outlined.
    </Banner>
  );
}
