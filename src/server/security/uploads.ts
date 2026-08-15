const PNG_SIGNATURE = "89504e470d0a1a0a";
const PDF_SIGNATURE = "%PDF-";

export function looksLikePdf(bytes: Buffer) {
  return bytes.subarray(0, PDF_SIGNATURE.length).toString("ascii") === PDF_SIGNATURE;
}

export function detectImageContentType(bytes: Buffer) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  if (bytes.length >= 8 && bytes.subarray(0, 8).toString("hex") === PNG_SIGNATURE) {
    return "image/png";
  }

  if (
    bytes.length >= 12 &&
    bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
    bytes.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return "image/webp";
  }

  return null;
}
