#!/usr/bin/env python3
"""
sms_service.py
Twilio SMS service for Gritly automations.

Functional when TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER
are set. Gracefully stubs when not configured — logs the message to stdout
instead of raising an error so the rest of the automation pipeline continues.
"""

import os
import re


# E.164 phone number format: + followed by 1-15 digits
_E164_RE = re.compile(r"^\+[1-9]\d{1,14}$")


def normalize_phone(raw: str) -> str | None:
    """
    Normalize a phone number to E.164 format.
    Returns None if the input cannot be normalised to a valid number.

    Handles:
      +14155551234  → +14155551234
      14155551234   → +14155551234
      (415) 555-1234 → +14155551234  (assumes North America if 10 digits)
      415-555-1234  → +14155551234
    """
    if not raw:
        return None

    # Strip all non-digit and non-plus characters
    digits = re.sub(r"[^\d+]", "", raw)

    # If it already starts with +, validate
    if digits.startswith("+"):
        return digits if _E164_RE.match(digits) else None

    # Strip leading zeros
    digits = digits.lstrip("0")

    if not digits:
        return None

    # North American 10-digit: prepend +1
    if len(digits) == 10:
        candidate = f"+1{digits}"
        return candidate if _E164_RE.match(candidate) else None

    # Already has country code (11+ digits): prepend +
    candidate = f"+{digits}"
    return candidate if _E164_RE.match(candidate) else None


class GritlySMSService:
    def __init__(
        self,
        account_sid: str | None = None,
        auth_token: str | None = None,
        from_number: str | None = None,
    ) -> None:
        self.enabled = bool(account_sid and auth_token and from_number)
        self._from_number = from_number

        if self.enabled:
            try:
                from twilio.rest import Client  # type: ignore[import-untyped]
                self._client = Client(account_sid, auth_token)
            except ImportError:
                self.enabled = False
                self._client = None
                print(
                    "[SMS] twilio package not installed — "
                    "run: pip install twilio"
                )
        else:
            self._client = None

    @classmethod
    def from_env(cls) -> "GritlySMSService":
        """Construct from environment variables. Missing vars → stub mode (no error)."""
        return cls(
            account_sid=os.getenv("TWILIO_ACCOUNT_SID"),
            auth_token=os.getenv("TWILIO_AUTH_TOKEN"),
            from_number=os.getenv("TWILIO_FROM_NUMBER"),
        )

    def send(self, to_number: str, message: str) -> tuple[bool, str]:
        """
        Send an SMS.
        Returns (success: bool, detail: str).
        When not configured, logs to stdout and returns success=True.
        """
        if not self.enabled:
            print(f"[SMS STUB] Would send to {to_number}: {message}")
            return True, "SMS not configured — message logged only"

        # Validate and normalize phone number
        normalized = normalize_phone(to_number)
        if normalized is None:
            return False, f"Invalid phone number format: {to_number}"

        try:
            msg = self._client.messages.create(  # type: ignore[union-attr]
                body=message,
                from_=self._from_number,
                to=normalized,
            )
            return True, f"SMS sent: {msg.sid}"
        except Exception as exc:
            return False, f"Twilio error: {exc}"
