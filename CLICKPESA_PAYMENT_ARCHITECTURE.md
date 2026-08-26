# ClickPesa Payment Architecture & Integration Guide

This document serves as a comprehensive blueprint for the ClickPesa payment architecture implemented in the Virtual House Renting project. It can be used as a reference to replicate this exact payment flow in other systems.

## 1. Core Architecture Overview
The payment system uses an asynchronous push-USSD model. When a customer initiates a payment, the backend sends a request to ClickPesa, which then pushes a USSD PIN prompt directly to the customer's mobile phone (e.g., Tigo Pesa, M-Pesa, Airtel Money). 

Because the payment isn't instantly completed (the user needs time to enter their PIN), the system relies on an asynchronous **Webhook** to notify the backend when the payment succeeds or fails.

## 2. Security Credentials & Environment Configuration
ClickPesa requires three critical security keys. These must **never** be hardcoded in the source code; they must reside in a `.env` file.

```env
# Example .env configuration
CLICKPESA_CLIENT_ID=IDh8c0hiPcsRPDWeduHhywefyRUwApKr
CLICKPESA_API_KEY=SKa43JBIn9PsK9UpyHRjSSKGO6d1HT82MqyKZJGHJN
CLICKPESA_CHECKSUM_SECRET=CHKfb34vW4mqk0Rqsg4aRNIzWzYuAX1IKTn
```

*   **Client ID:** Identifies your specific merchant account.
*   **API Key:** Used to authorize outbound HTTP requests (Payment Initiation) from your backend to ClickPesa.
*   **Checksum Secret:** The most critical key for the Webhook. It is used to generate an HMAC-SHA256 signature to verify that incoming webhook callbacks actually came from ClickPesa and were not forged by a hacker.

## 3. Webhook & Callback Infrastructure
When a payment is completed on the user's phone, ClickPesa sends an HTTP POST request containing the payment data to your backend. 

### Local Development via Ngrok
ClickPesa cannot send webhooks to `http://localhost:8000` because localhost is not accessible from the public internet. To solve this during development:

1.  **Run Ngrok:** Start an ngrok tunnel pointing to your Django server port:
    ```bash
    ngrok http 8000
    ```
2.  **Get Public URL:** Ngrok provides a public HTTPS URL (e.g., `https://cattail-enjoyable-photo.ngrok-free.dev`).
3.  **Configure Webhook:** You must log in to the ClickPesa Merchant Dashboard and set your Callback URL to:
    `https://cattail-enjoyable-photo.ngrok-free.dev/api/clickpesa/webhook/`
4.  **Django Allowed Hosts:** Ensure this ngrok domain is added to `ALLOWED_HOSTS` in your `settings.py`.

## 4. Checksum Security (HMAC-SHA256)
The webhook payload sent by ClickPesa includes a `checksum` field. Your backend must independently calculate its own checksum using the incoming payload data and the `CLICKPESA_CHECKSUM_SECRET`. If your calculated checksum matches the one sent by ClickPesa, the request is authentic.

### Canonical JSON Ordering
A major gotcha with ClickPesa's architecture is that the JSON data must be strictly alphabetically ordered (Canonical JSON) with absolutely no whitespaces between keys and values before hashing.

**Python Implementation Strategy:**
```python
# Extract the payload data
data_dict = payload.get("data", {})
provided_checksum = data_dict.pop("checksum", "")
data_dict.pop("checksumMethod", None)

# 1. Create a compact, alphabetically sorted JSON string
canonical_string = json.dumps(data_dict, separators=(',', ':'), sort_keys=True)

# 2. Hash it using HMAC-SHA256
hmac_hash = hmac.new(
    settings.CLICKPESA_CHECKSUM_SECRET.encode('utf-8'),
    canonical_string.encode('utf-8'),
    hashlib.sha256
).hexdigest()

# 3. Compare
if hmac_hash == provided_checksum:
    # Authenticated!
```

## 5. Flow of Operations
1.  **Initiation (`POST /api/payment/initiate/`)**: Frontend sends phone number and property ID. Django creates a `Payment` record with status `PENDING` and calls ClickPesa API.
2.  **Waiting**: Frontend begins polling the status endpoint (`GET /api/payment/verify/`) every 5-8 seconds.
3.  **USSD Prompt**: Customer enters PIN on their phone.
4.  **Webhook (`POST /api/clickpesa/webhook/`)**: ClickPesa posts success payload to Ngrok -> Django.
5.  **Processing**: Django verifies the checksum. If valid, it updates the `Payment` status to `SUCCESSFUL`, marks the property as `Occupied`, and creates a `RentalRequest`.
6.  **Completion**: Frontend poll detects `SUCCESSFUL` status, displays a 2.5-second auto-closing success modal, and stops polling.
