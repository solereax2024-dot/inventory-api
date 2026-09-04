# PayMongo Checkout Setup

This project now includes a hosted PayMongo checkout flow for customer reservations.

## 1) Configure environment variables

Set these before starting the backend:

```bash
export PAYMONGO_ENABLED=true
export PAYMONGO_SECRET_KEY=sk_test_xxxxx
export PAYMONGO_WEBHOOK_TOKEN=your-random-webhook-token
export PAYMONGO_WEBHOOK_SIGNING_SECRET=whsec_xxxxx
export PAYMONGO_WEBHOOK_TOLERANCE_SECONDS=300
export PAYMONGO_CHECKOUT_SUCCESS_URL=https://solereax.com/collections?payment=success
export PAYMONGO_CHECKOUT_CANCEL_URL=https://solereax.com/collections?payment=cancel
# Comma-separated methods. Keep only methods enabled in your PayMongo account.
export PAYMONGO_PAYMENT_METHOD_TYPES=gcash,paymaya,card
```

## 2) Checkout API flow

- Reserve item via `POST /api/public/orders/reserve`
- Start payment via `POST /api/public/payments/paymongo/checkout`
  - request body:

```json
{
  "orderId": 123,
  "successUrl": "https://solereax.com/reserve/123?payment=success",
  "cancelUrl": "https://solereax.com/reserve/123?payment=cancel"
}
```

- Response contains `checkoutUrl` for redirect.

## 3) Webhook setup

Create a webhook endpoint in PayMongo dashboard pointing to:

- `POST https://<your-domain>/api/public/payments/paymongo/webhook`

Preferred: pass through the signature header from PayMongo:

- `Paymongo-Signature: t=<unix_ts>,v1=<hmac_sha256>`

Fallback (legacy mode): add this custom header in your reverse proxy or webhook relay:

- `X-Paymongo-Webhook-Token: <PAYMONGO_WEBHOOK_TOKEN>`

If `PAYMONGO_WEBHOOK_SIGNING_SECRET` is configured, the backend verifies HMAC signatures and ignores token-only auth.

## 4) Notes

- `OrderStatus` is set to `PAID` only when a paid webhook event is received.
- If checkout is created, order gets `paymentStatus=PENDING`.
- Do not mark payments as paid from frontend redirect alone.

