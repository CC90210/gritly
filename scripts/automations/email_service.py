#!/usr/bin/env python3
"""
email_service.py
Self-contained SMTP email service for Gritly automations.

Uses the business owner's Gmail SMTP (App Password) so every email
arrives FROM a real person, not "noreply@gritly.com".
The owner is automatically CC'd on every outbound email.
"""

import smtplib
import os
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

# Default SMTP timeout in seconds — prevents scripts from hanging indefinitely
# when the mail server is unreachable.
_SMTP_TIMEOUT = 30


class GritlyEmailService:
    def __init__(
        self,
        smtp_host: str,
        smtp_port: int,
        smtp_user: str,
        smtp_password: str,
        from_name: str,
        from_email: str,
    ) -> None:
        self.smtp_host = smtp_host
        self.smtp_port = smtp_port
        self.smtp_user = smtp_user
        self.smtp_password = smtp_password
        self.from_name = from_name
        self.from_email = from_email

    @classmethod
    def from_env(cls) -> "GritlyEmailService":
        """Construct from environment variables. Raises EnvironmentError if any are missing."""
        required = [
            "SMTP_HOST",
            "SMTP_USER",
            "SMTP_PASSWORD",
            "FROM_NAME",
            "FROM_EMAIL",
        ]
        missing = [k for k in required if not os.getenv(k)]
        if missing:
            raise EnvironmentError(
                f"Missing required email env vars: {', '.join(missing)}. "
                "Set them in .env.local or scripts/automations/.env"
            )
        return cls(
            smtp_host=os.environ["SMTP_HOST"],
            smtp_port=int(os.getenv("SMTP_PORT", "587")),
            smtp_user=os.environ["SMTP_USER"],
            smtp_password=os.environ["SMTP_PASSWORD"],
            from_name=os.environ["FROM_NAME"],
            from_email=os.environ["FROM_EMAIL"],
        )

    @property
    def enabled(self) -> bool:
        return bool(
            self.smtp_host
            and self.smtp_user
            and self.smtp_password
            and self.from_email
        )

    def send(
        self,
        to_email: str,
        subject: str,
        html_body: str,
        cc: str | None = None,
    ) -> tuple[bool, str]:
        """
        Send an HTML email via SMTP.
        Returns (success: bool, detail: str).
        """
        if not self.enabled:
            print(
                f"[EMAIL STUB] Would send '{subject}' to {to_email}"
            )
            return True, "Email not configured — message logged only"

        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{self.from_name} <{self.from_email}>"
        msg["To"] = to_email
        if cc:
            msg["Cc"] = cc

        msg.attach(MIMEText(html_body, "html"))

        recipients = [to_email]
        if cc:
            recipients.append(cc)

        try:
            with smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=_SMTP_TIMEOUT) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(self.smtp_user, self.smtp_password)
                server.sendmail(self.from_email, recipients, msg.as_string())
            return True, f"Sent to {to_email}"
        except smtplib.SMTPAuthenticationError as exc:
            return False, f"SMTP auth failed — check App Password: {exc}"
        except smtplib.SMTPRecipientsRefused as exc:
            return False, f"Recipient refused: {exc}"
        except smtplib.SMTPConnectError as exc:
            return False, f"SMTP connection failed: {exc}"
        except TimeoutError:
            return False, f"SMTP connection timed out after {_SMTP_TIMEOUT}s"
        except OSError as exc:
            return False, f"Network error: {exc}"
        except Exception as exc:
            return False, str(exc)
