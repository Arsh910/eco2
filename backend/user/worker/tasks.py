from celery import shared_task


@shared_task(
    bind=True, autoretry_for=(Exception,), max_retries=3, default_retry_delay=120
)
def send_email_task(self, link, to_email):
    from user.utils import send_email

    delivered = send_email(link, to_email)

    if delivered == 0:
        raise Exception("SMTP delivery failed")
    return True
