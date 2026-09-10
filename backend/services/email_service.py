import os
import smtplib
import logging
import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, Dict, Any

from backend.config import load_settings

logger = logging.getLogger("email_service")

def send_alert_email(subject: str, html_body: str, to_email: Optional[str] = None) -> bool:
    """Dispatches a styled HTML email alert using configured SMTP credentials."""
    settings = load_settings()
    recipient = to_email or settings.alert_email

    if not recipient or not recipient.strip():
        logger.warning("[EmailService] No recipient alert email configured. Skipping notification.")
        return False

    if not settings.smtp_enabled:
        logger.info("[EmailService] SMTP alerts disabled in settings. Skipping notification.")
        return False

    smtp_host = settings.smtp_host or "smtp.gmail.com"
    smtp_port = settings.smtp_port or 587
    smtp_user = settings.smtp_user
    smtp_password = settings.smtp_password

    if not smtp_user or not smtp_password:
        logger.warning("[EmailService] Incomplete SMTP credentials (user/password missing). Cannot send email.")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"ViralClip AI Agent <{smtp_user}>"
        msg["To"] = recipient

        # Plain text fallback
        plain_text = f"{subject}\n\nPlease view this message in an HTML-compatible email client."
        msg.attach(MIMEText(plain_text, "plain"))
        msg.attach(MIMEText(html_body, "html"))

        logger.info(f"[EmailService] Connecting to SMTP server {smtp_host}:{smtp_port}...")
        server = smtplib.SMTP(smtp_host, smtp_port, timeout=15)
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(smtp_user, smtp_password)
        server.sendmail(smtp_user, recipient, msg.as_string())
        server.quit()
        logger.info(f"[EmailService] Email successfully sent to {recipient} with subject: '{subject}'")
        return True
    except Exception as e:
        logger.error(f"[EmailService] Failed to send email alert to {recipient}: {e}")
        return False

def send_error_alert(stage: str, error_message: str, details: Optional[Dict[str, Any]] = None) -> bool:
    """Dispatches a high-priority incident notification when the autonomous pipeline fails or is stuck."""
    settings = load_settings()
    if not settings.notify_on_error:
        return False

    timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC")
    details_rows = ""
    if details:
        for k, v in details.items():
            details_rows += f"""
            <tr>
                <td style="padding: 6px 12px; color: #94a3b8; font-weight: 600; border-bottom: 1px solid #1e293b;">{k.replace('_', ' ').title()}</td>
                <td style="padding: 6px 12px; color: #f1f5f9; border-bottom: 1px solid #1e293b; font-family: monospace;">{v}</td>
            </tr>
            """

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b0f17; color: #f1f5f9; margin: 0; padding: 24px; }}
            .card {{ background-color: #111827; border: 1px solid #dc2626; border-radius: 12px; padding: 24px; max-width: 600px; margin: 0 auto; }}
            .badge {{ display: inline-block; background-color: rgba(220, 38, 38, 0.2); color: #ef4444; border: 1px solid #dc2626; border-radius: 9999px; padding: 4px 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; }}
            .title {{ font-size: 20px; font-weight: 800; color: #ffffff; margin: 12px 0 8px 0; }}
            .error-box {{ background-color: #1e1b2e; border: 1px solid #450a0a; border-left: 4px solid #ef4444; border-radius: 6px; padding: 14px; margin: 16px 0; font-family: monospace; font-size: 13px; color: #fca5a5; word-break: break-word; }}
            .meta-table {{ width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 13px; }}
            .footer {{ font-size: 11px; color: #64748b; margin-top: 24px; text-align: center; border-top: 1px solid #1e293b; padding-top: 16px; }}
        </style>
    </head>
    <body>
        <div class="card">
            <span class="badge">Pipeline Failure Alert</span>
            <div class="title">⚠️ Auto-Pilot Error in {stage}</div>
            <p style="color: #94a3b8; font-size: 14px; margin: 0 0 16px 0;">
                The 24/7 GTA Auto-Pilot Agent encountered a disruption during autonomous processing.
            </p>

            <div class="error-box">
                {error_message}
            </div>

            <table class="meta-table">
                <tr>
                    <td style="padding: 6px 12px; color: #94a3b8; font-weight: 600; border-bottom: 1px solid #1e293b;">Failed Stage</td>
                    <td style="padding: 6px 12px; color: #f1f5f9; border-bottom: 1px solid #1e293b;">{stage}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 12px; color: #94a3b8; font-weight: 600; border-bottom: 1px solid #1e293b;">Incident Time</td>
                    <td style="padding: 6px 12px; color: #f1f5f9; border-bottom: 1px solid #1e293b;">{timestamp}</td>
                </tr>
                {details_rows}
            </table>

            <div style="background-color: #1e293b; border-radius: 8px; padding: 12px; font-size: 12px; color: #cbd5e1; margin-top: 16px;">
                <strong>💡 Self-Recovery Action:</strong> The background agent will safely pause the current task and attempt the next scheduled cycle automatically. You can check cookies, credentials, or re-run from the studio dashboard.
            </div>

            <div class="footer">
                ViralClip AI • Autonomous Cloud Studio • Host: EC2 (16.176.205.69)
            </div>
        </div>
    </body>
    </html>
    """

    subject = f"🚨 [ViralClip AI Alert] Auto-Pilot Failed at {stage}"
    return send_alert_email(subject, html)

def send_milestone_alert(video_title: str, youtube_url: str, view_count: int, like_count: int, milestone: int = 100000) -> bool:
    """Dispatches a celebration email when an autonomous GTA Short crosses a viral view threshold."""
    settings = load_settings()
    if not settings.notify_on_milestone:
        return False

    formatted_views = f"{view_count:,}"
    formatted_milestone = f"{milestone:,}"
    formatted_likes = f"{like_count:,}"

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b0f17; color: #f1f5f9; margin: 0; padding: 24px; }}
            .card {{ background: linear-gradient(135deg, #111827 0%, #1e1b4b 100%); border: 1px solid #6366f1; border-radius: 16px; padding: 28px; max-width: 600px; margin: 0 auto; box-shadow: 0 10px 25px rgba(99, 102, 241, 0.2); }}
            .badge {{ display: inline-block; background-color: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid #10b981; border-radius: 9999px; padding: 5px 14px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }}
            .title {{ font-size: 22px; font-weight: 800; color: #ffffff; margin: 16px 0 6px 0; }}
            .stats-grid {{ display: flex; gap: 12px; margin: 20px 0; }}
            .stat-box {{ flex: 1; background-color: rgba(15, 23, 42, 0.7); border: 1px solid #334155; border-radius: 10px; padding: 14px; text-align: center; }}
            .stat-val {{ font-size: 24px; font-weight: 800; color: #38bdf8; margin-top: 4px; }}
            .stat-lbl {{ font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase; }}
            .button {{ display: inline-block; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 700; font-size: 14px; margin-top: 16px; box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3); }}
            .footer {{ font-size: 11px; color: #64748b; margin-top: 24px; text-align: center; border-top: 1px solid #1e293b; padding-top: 16px; }}
        </style>
    </head>
    <body>
        <div class="card">
            <span class="badge">🔥 Viral Growth Milestone</span>
            <div class="title">🎉 Your GTA Short Hit {formatted_milestone} Views!</div>
            <p style="color: #cbd5e1; font-size: 14px; line-height: 1.5; margin: 0 0 16px 0;">
                One of your autonomous GTA Shorts has crossed <strong>{formatted_views} views</strong> and is receiving algorithmic recommendation velocity!
            </p>

            <div style="background-color: rgba(15, 23, 42, 0.8); border: 1px solid #334155; border-radius: 10px; padding: 16px; margin: 16px 0;">
                <div style="font-size: 11px; color: #94a3b8; text-transform: uppercase; font-weight: 600;">Video Title</div>
                <div style="font-size: 15px; font-weight: 700; color: #ffffff; margin-top: 4px;">{video_title}</div>
            </div>

            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                <tr>
                    <td style="width: 50%; padding: 8px;">
                        <div class="stat-box">
                            <div class="stat-lbl">Live Views</div>
                            <div class="stat-val" style="color: #34d399;">{formatted_views}</div>
                        </div>
                    </td>
                    <td style="width: 50%; padding: 8px;">
                        <div class="stat-box">
                            <div class="stat-lbl">Likes</div>
                            <div class="stat-val" style="color: #38bdf8;">{formatted_likes}</div>
                        </div>
                    </td>
                </tr>
            </table>

            <div style="text-align: center; margin: 12px 0;">
                <a href="{youtube_url}" class="button" target="_blank">
                    ▶️ Watch Video on YouTube
                </a>
            </div>

            <div style="background-color: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.3); border-radius: 8px; padding: 12px; font-size: 12px; color: #c7d2fe; margin-top: 16px;">
                <strong>🧠 Agent AI Takeaway:</strong> The AI reflection memory has cataloged this video's hook style and pacing to prioritize similar high-energy moments in upcoming cycles.
            </div>

            <div class="footer">
                ViralClip AI • Autonomous Cloud Studio • Connected Channel: Bharath Marri
            </div>
        </div>
    </body>
    </html>
    """

    subject = f"🎉 [ViralClip AI] Your GTA Short Passed {formatted_milestone} Views! 🚀"
    return send_alert_email(subject, html)

def test_smtp_connection(to_email: Optional[str] = None) -> Dict[str, Any]:
    """Tests the SMTP connection and sends a verification email."""
    settings = load_settings()
    recipient = to_email or settings.alert_email

    if not recipient or not recipient.strip():
        return {"status": "error", "message": "No destination alert email configured."}

    if not settings.smtp_user or not settings.smtp_password:
        return {"status": "error", "message": "SMTP User (sender email) or SMTP Password is missing in settings."}

    smtp_host = settings.smtp_host or "smtp.gmail.com"
    smtp_port = settings.smtp_port or 587

    html = f"""
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"></head>
    <body style="font-family: sans-serif; background-color: #0b0f17; color: #f1f5f9; padding: 24px;">
        <div style="max-width: 500px; margin: 0 auto; background: #111827; border: 1px solid #10b981; border-radius: 12px; padding: 24px;">
            <h2 style="color: #34d399; margin-top: 0;">✅ Email Alert Verification Successful!</h2>
            <p style="color: #cbd5e1; font-size: 14px;">
                Your ViralClip AI 24/7 Agent is now connected to this email address.
            </p>
            <ul style="color: #94a3b8; font-size: 13px; line-height: 1.6;">
                <li>🚨 <strong>Failure Alerts:</strong> Active (You will be notified immediately if a download fails or upload token expires)</li>
                <li>🎉 <strong>Milestone Alerts:</strong> Active (Notifies when videos hit 100k views)</li>
            </ul>
            <p style="font-size: 11px; color: #64748b; margin-top: 20px;">
                Timestamp: {datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S UTC")}
            </p>
        </div>
    </body>
    </html>
    """

    success = send_alert_email("✅ [ViralClip AI] Email Alert System Verified", html, to_email=recipient)
    if success:
        return {"status": "success", "message": f"Verification email successfully delivered to {recipient}!"}
    else:
        return {"status": "error", "message": "Failed to connect to SMTP server. Check credentials, host/port, or Google App Password."}
