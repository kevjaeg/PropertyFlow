import logging
from app.core.config import settings

logger = logging.getLogger(__name__)


def send_lead_notification(
    agent_email: str,
    agent_name: str,
    lead_name: str,
    lead_email: str,
    lead_phone: str | None,
    message: str | None,
    listing_address: str,
):
    """Send lead notification email to agent via Resend. Fails silently."""
    if not settings.RESEND_API_KEY:
        logger.warning("RESEND_API_KEY not set, skipping email notification")
        return

    try:
        import resend
        resend.api_key = settings.RESEND_API_KEY

        phone_html = f"<p>Phone: {lead_phone}</p>" if lead_phone else ""
        message_html = f"<p>Message: {message}</p>" if message else ""

        resend.Emails.send({
            "from": "PropertyFlow <notifications@propertyflow.app>",
            "to": agent_email,
            "subject": f"New Lead for {listing_address}",
            "html": f"""
                <h2>New inquiry for {listing_address}</h2>
                <p><strong>{lead_name}</strong> is interested in this property.</p>
                <p>Email: {lead_email}</p>
                {phone_html}
                {message_html}
                <hr>
                <p style="color:#666;font-size:12px">Sent via PropertyFlow</p>
            """,
        })
        logger.info(f"Lead notification sent to {agent_email}")
    except Exception as e:
        logger.error(f"Failed to send lead notification: {e}")
