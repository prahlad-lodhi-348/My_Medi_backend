from django.contrib.auth.models import AbstractUser
from django.db import models
import uuid


class User(AbstractUser):
    email = models.EmailField(unique=True)
    is_email_verified = models.BooleanField(default=False)
    email_verification_token = models.UUIDField(null=True, blank=True, default=uuid.uuid4)

    def generate_verification_token(self):
        self.email_verification_token = uuid.uuid4()
        self.save()
        return self.email_verification_token


class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    phone = models.CharField(max_length=15, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    step_count = models.IntegerField(default=0)
    water_intake = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.user.username}'s Profile"


class Medicine(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    dosage = models.CharField(max_length=50)
    frequency = models.CharField(max_length=50)
    notes = models.TextField(blank=True)
    image = models.ImageField(upload_to='medicines/', blank=True, null=True)
    working_mechanism = models.TextField(blank=True, default='Information not available')
    side_effects = models.TextField(blank=True, default='Information not available')
    is_taken = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    
    # New AI analysis fields
    strength = models.CharField(max_length=100, blank=True, default="")
    form = models.CharField(max_length=50, default="tablet", blank=True)
    description = models.TextField(blank=True, default="")

    def __str__(self):
        return f"{self.name} - {self.user.username}"



class Regimen(models.Model):
    """A treatment regimen for a medicine (links to Medicine)."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='regimens')
    medicine = models.ForeignKey(
        Medicine, on_delete=models.CASCADE, related_name='regimens'
    )

    name = models.CharField(max_length=120, blank=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name or self.medicine.name} ({self.user.username})"


class RegimenDose(models.Model):
    """A scheduled dose instance for a regimen at a specific date/time."""
    regimen = models.ForeignKey(Regimen, on_delete=models.CASCADE, related_name='doses')
    scheduled_at = models.DateTimeField()
    quantity = models.PositiveIntegerField(default=1)          # NEW
    unit = models.CharField(max_length=20, default='TABLET')    # NEW
    taken_at = models.DateTimeField(null=True, blank=True)
    missed_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=(...), default='scheduled')
    created_at = models.DateTimeField(auto_now_add=True)
    taken_at = models.DateTimeField(null=True, blank=True)
    missed_at = models.DateTimeField(null=True, blank=True)

    # convenience statuses
    status = models.CharField(
        max_length=20,
        choices=(
            ('scheduled', 'Scheduled'),
            ('taken', 'Taken'),
            ('missed', 'Missed'),
        ),
        default='scheduled',
    )

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=['scheduled_at'])]

    def __str__(self):
        return f"Dose for {self.regimen_id} at {self.scheduled_at} ({self.status})"


class StockItem(models.Model):
    """Represents remaining quantity for a given regimen."""

    regimen = models.OneToOneField(Regimen, on_delete=models.CASCADE, related_name='stock')
    quantity_remaining = models.PositiveIntegerField(default=0)
    unit = models.CharField(max_length=20, default='TABLET') 
    last_restocked_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Stock for regimen {self.regimen_id}: {self.quantity_remaining}"


class StockAlert(models.Model):
    """Low-stock alerts tied to a regimen."""

    regimen = models.ForeignKey(Regimen, on_delete=models.CASCADE, related_name='stock_alerts')
    threshold = models.PositiveIntegerField(default=5)
    is_active = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Alert for regimen {self.regimen_id} (threshold={self.threshold})"

