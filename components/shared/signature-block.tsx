/** Signature block for printed PDFs: image (if set) above the line. */
export function SignatureBlock({
  companyName,
  signatureUrl,
}: {
  companyName: string;
  signatureUrl?: string | null;
}) {
  return (
    <div className="flex justify-end pt-10">
      <div className="text-center">
        {signatureUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={signatureUrl}
            alt="Signature"
            className="mx-auto mb-1 h-16 max-w-[12rem] object-contain"
          />
        ) : (
          <div className="h-12" />
        )}
        <div className="mx-auto w-48 border-t border-foreground pt-1" />
        <p className="text-sm font-medium">For {companyName}</p>
        <p className="text-xs text-muted-foreground">Authorised Signatory</p>
      </div>
    </div>
  );
}
