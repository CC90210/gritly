#!/usr/bin/env python3
"""
sms_service.py
Twilio SMS service for Gritly automations.

Functional when TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM_NUMBER
are set. Gracefully stubs when not configured — logs the message to stdout
instead of raising an error so the rest of the automation pipeline continues.
"""

import os


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

        try:
            msg = self._client.messages.create(  # type: ignore[union-attr]
                body=message,
                from_=self._from_number,
                to=to_number,
            )
            return True, f"SMS sent: {msg.sid}"
        except Exception as exc:
            return False, str(exc)
