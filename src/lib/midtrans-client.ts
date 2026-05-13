/** Hanya untuk client — tanpa secret. */
export function midtransSnapScriptUrlForClient(isProduction: boolean): string {
  return isProduction
    ? "https://app.midtrans.com/snap/snap.js"
    : "https://app.sandbox.midtrans.com/snap/snap.js";
}
