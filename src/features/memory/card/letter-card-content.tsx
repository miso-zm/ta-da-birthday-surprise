type LetterCardContentProps = {
  recipientName: string;
  message: string;
  signature: string;
  recipientClassName: string;
  messageRegionClassName: string;
  messageClassName: string;
  signatureClassName: string;
};

export function LetterCardContent({
  recipientName,
  message,
  signature,
  recipientClassName,
  messageRegionClassName,
  messageClassName,
  signatureClassName,
}: LetterCardContentProps) {
  return (
    <>
      <p className={recipientClassName} data-letter-role="recipient">给 {recipientName}</p>
      <div className={messageRegionClassName}>
        <p className={messageClassName} data-letter-role="message">{message}</p>
      </div>
      <p className={signatureClassName} data-letter-role="signature">{signature}</p>
    </>
  );
}
