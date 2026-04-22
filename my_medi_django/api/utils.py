from django.core.mail import send_mail
from django.urls import reverse
from django.conf import settings
import uuid

def send_verification_email(user, request):
    token = str(uuid.uuid4())
    user.email_verification_token = token
    user.save()

    verification_url = f"http://{request.get_host()}/api/verify-email/{token}/"

    send_mail(
        'Verify your account',
        f'Click to verify: {verification_url}',
        settings.EMAIL_HOST_USER,
        [user.email],
        fail_silently=False,
    )