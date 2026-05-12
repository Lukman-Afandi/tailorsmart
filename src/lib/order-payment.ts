/** Pajak dihitung dari subtotal order (pembulatan ke rupiah terdekat, sama seperti PDF faktur). */
export function invoiceGrandTotal(subtotalIdr: number, taxPercent: number) {
  const tax = Math.round((subtotalIdr * taxPercent) / 100);
  return { tax, total: subtotalIdr + tax };
}

export function balanceDue(totalIdr: number, paidIdr: number) {
  return Math.max(0, totalIdr - paidIdr);
}
