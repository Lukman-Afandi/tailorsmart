/** Potongan respons GET /v2/{order_id}/status & notifikasi HTTP. */
export type MidtransTransactionStatusBody = {
  order_id?: string;
  gross_amount?: string;
  status_code?: string;
  transaction_status?: string;
  signature_key?: string;
  fraud_status?: string;
  payment_type?: string;
  transaction_time?: string;
  currency?: string;
  [key: string]: unknown;
};

export type MidtransSnapCreateResponse = {
  token: string;
  redirect_url?: string;
};

export class MidtransApiError extends Error {
  constructor(
    readonly statusCode: number,
    readonly body: string,
  ) {
    super(`Midtrans API error ${statusCode}: ${body.slice(0, 500)}`);
    this.name = "MidtransApiError";
  }
}
