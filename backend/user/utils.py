from django.core.mail import EmailMultiAlternatives
from django.conf import settings


def make_email(link: str, to_email: str) -> dict:
    """
    Build the subject plus both plain-text and HTML bodies.
    """
    subject = "Reset Your Password"

    text_body = (
        "Hi,\n\n"
        "You requested to reset your password.\n\n"
        f"Click the link below to proceed:\n{link}\n\n"
        "If you didn’t request this, you can ignore this email.\n\n"
        "Thanks,\nYour Website Team"
    )

    html_body = f"""
    <!DOCTYPE html>
    <html>
      <body style="font-family: Arial, sans-serif; background-color:#f7f7f7; padding:20px;">
        <table role="presentation" width="100%%" cellpadding="0" cellspacing="0">
          <tr>
            <td align="center">
              <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:white;border-radius:8px;padding:30px;">
                <tr>
                  <td style="text-align:center;">
                    <h2 style="color:#333;margin-bottom:24px;">Reset Your Password</h2>
                  </td>
                </tr>
                <tr>
                  <td style="font-size:15px;color:#555;">
                    <p>Hello, from Ikarus Blogs</p>
                    <p>You requested to reset your password. Click the button below to proceed:</p>
                    <p style="text-align:center;margin:30px 0;">
                      <a href="{link}"
                         style="
                           background:#4CAF50;
                           color:#ffffff;
                           text-decoration:none;
                           padding:12px 24px;
                           border-radius:4px;
                           display:inline-block;
                           font-weight:bold;
                         ">
                        Reset Password
                      </a>
                    </p>
                    <p>If you didn’t request this, you can safely ignore this email.</p>
                    <p style="margin-top:32px;">Thanks,<br>Collabus</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
    """

    return {
        "subject": subject,
        "text_body": text_body,
        "html_body": html_body,
        "to_email": to_email,
    }


def send_email(link: str, to_email: str) -> bool:
    data = make_email(link, to_email)
    email = EmailMultiAlternatives(
        subject=data["subject"],
        body=data["text_body"],
        from_email=settings.EMAIL_HOST_USER,
        to=[data["to_email"]],
    )
    email.attach_alternative(data["html_body"], "text/html")
    return bool(email.send(fail_silently=False))
