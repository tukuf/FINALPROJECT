import hashlib
import hmac
import json
import re
import secrets
import string
from decimal import Decimal, ROUND_HALF_UP
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.conf import settings
from django.utils import timezone


SUCCESS_STATUSES = {"SUCCESS", "SUCCESSFUL", "COMPLETED", "PAID"}
FAILED_STATUSES = {"FAILED", "REJECTED", "CANCELLED", "CANCELED", "TIMEOUT"}


class ClickPesaError(Exception):
    pass


def normalize_tanzania_phone(phone_number):
    digits = re.sub(r"\D", "", str(phone_number or ""))

    if digits.startswith("00255"):
        digits = digits[2:]
    elif digits.startswith("0") and len(digits) == 10:
        digits = "255" + digits[1:]
    elif digits.startswith("7") or digits.startswith("6"):
        digits = "255" + digits

    if not re.fullmatch(r"255[67]\d{8}", digits):
        raise ValueError("Enter a valid Tanzanian mobile number.")

    return digits


def _canonicalize(value):
    if isinstance(value, dict):
        return {key: _canonicalize(value[key]) for key in sorted(value)}
    if isinstance(value, list):
        return [_canonicalize(item) for item in value]
    return value


def canonical_json(payload):
    return json.dumps(_canonicalize(payload), separators=(",", ":"), ensure_ascii=False)


def generate_checksum(payload):
    secret = settings.CLICKPESA_CHECKSUM_SECRET
    if not secret:
        raise ClickPesaError("ClickPesa checksum secret is not configured.")

    message = canonical_json(payload).encode("utf-8")
    return hmac.new(secret.encode("utf-8"), message, hashlib.sha256).hexdigest()


def verify_checksum(payload, request=None):
    import logging
    logger = logging.getLogger(__name__)

    # ClickPesa wraps everything inside a "data" key:
    # { "event": "PAYMENT ...", "data": { "checksum": "...", "orderReference": "..." } }
    # So we must look inside "data" first.
    data = payload.get("data") if isinstance(payload.get("data"), dict) else payload

    logger.info("[ClickPesa Webhook] Received payload: %s", json.dumps(dict(payload), default=str))

    # Get the checksum supplied by ClickPesa (inside "data")
    supplied = str(data.get("checksum", "") or "")

    # Fallback: check HTTP headers if still empty
    if not supplied and request is not None:
        supplied = (
            request.headers.get("X-Clickpesa-Signature", "")
            or request.headers.get("X-Checksum", "")
            or request.headers.get("Checksum", "")
            or ""
        )

    logger.info("[ClickPesa Webhook] Supplied checksum: '%s'", supplied)

    if not supplied:
        logger.warning("[ClickPesa Webhook] No checksum found in body or headers — rejecting.")
        return False

    # Remove checksum fields before recomputing
    unsigned = {k: v for k, v in data.items() if k not in {"checksum", "checksumMethod"}}
    expected = generate_checksum(unsigned)
    logger.info("[ClickPesa Webhook] Expected checksum: '%s'", expected)

    result = hmac.compare_digest(supplied, expected)
    if not result:
        logger.warning("[ClickPesa Webhook] Checksum MISMATCH — supplied vs expected do NOT match.")
    return result



def generate_payment_reference(prefix="HR"):
    # %y%m%d%H%M%S generates a 12-character timestamp (e.g., 260817142109)
    timestamp = timezone.now().strftime("%y%m%d%H%M%S")
    alphabet = string.ascii_uppercase + string.digits
    # Generate a 4-character random suffix
    suffix = "".join(secrets.choice(alphabet) for _ in range(4))
    
    # Total length: 2 (prefix) + 12 (timestamp) + 4 (suffix) = 18 characters
    return f"{prefix}{timestamp}{suffix}"



def format_clickpesa_amount(amount):
    value = Decimal(amount).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    return str(value)


class ClickPesaClient:
    token_url = "https://api.clickpesa.com/third-parties/generate-token"
    ussd_push_url = (
        "https://api.clickpesa.com/third-parties/payments/initiate-ussd-push-request"
    )

    def __init__(self):
        self.client_id = settings.CLICKPESA_CLIENT_ID
        self.api_key = settings.CLICKPESA_API_KEY

    def _ensure_configured(self):
        if not self.client_id or not self.api_key:
            raise ClickPesaError("ClickPesa credentials are not configured.")

    def generate_token(self):
        self._ensure_configured()
        data = self._post_json(
            self.token_url,
            headers={
                "api-key": self.api_key,
                "client-id": self.client_id,
            },
            error_context="authentication",
        )

        token = data.get("token") or data.get("accessToken") or data.get("access_token")
        if not token and isinstance(data.get("data"), dict):
            token = (
                data["data"].get("token")
                or data["data"].get("accessToken")
                or data["data"].get("access_token")
            )
        if not token:
            raise ClickPesaError("ClickPesa token response did not include a token.")
        return str(token).strip()

    def initiate_ussd_push(self, *, amount, reference, phone_number):
        token = self.generate_token()
        payload = {
            "amount": format_clickpesa_amount(amount),
            "currency": settings.CLICKPESA_CURRENCY,
            "orderReference": reference,
            "phoneNumber": phone_number,
        }
        payload["checksum"] = generate_checksum(payload)
        payload["checksumMethod"] = "canonical"

        return self._post_json(
            self.ussd_push_url,
            payload=payload,
            headers={
                "Authorization": self._authorization_header(token),
                "Content-Type": "application/json",
            },
            error_context="USSD push initiation",
        )

    def _authorization_header(self, token):
        if token.lower().startswith("bearer "):
            return token
        return f"Bearer {token}"

    def _post_json(self, url, *, payload=None, headers=None, error_context="request"):
        body = None
        request_headers = dict(headers or {})
        if payload is not None:
            body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
            request_headers.setdefault("Content-Type", "application/json")

        request = Request(url, data=body, headers=request_headers, method="POST")
        try:
            with urlopen(request, timeout=30) as response:
                response_body = response.read().decode("utf-8")
        except HTTPError as exc:
            response_body = exc.read().decode("utf-8", errors="replace")
            detail = _safe_error_detail(response_body)
            message = f"ClickPesa {error_context} returned HTTP {exc.code}"
            if detail:
                message = f"{message}: {detail}"
            raise ClickPesaError(message) from exc
        except URLError as exc:
            raise ClickPesaError(f"Could not reach ClickPesa during {error_context}.") from exc

        try:
            return json.loads(response_body or "{}")
        except json.JSONDecodeError as exc:
            raise ClickPesaError(f"ClickPesa {error_context} returned invalid JSON.") from exc


def _safe_error_detail(response_body):
    if not response_body:
        return ""
    try:
        data = json.loads(response_body)
    except json.JSONDecodeError:
        return response_body[:180]

    for key in ["message", "error", "detail"]:
        value = data.get(key)
        if value:
            return str(value)[:180]
    return ""
