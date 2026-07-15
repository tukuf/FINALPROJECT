# Create your models here.
from django.contrib.auth.models import AbstractUser
from django.db import models

# User model


class User(AbstractUser):
    ROLE_CHOICES = (
        ("ADMIN", "Admin"),
        ("CLIENT", "Client"),
    )

    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default="CLIENT")
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)

    def __str__(self):
        return self.username


# PROPERTY MODEL


class Property(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="properties")

    title = models.CharField(max_length=255)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    location = models.CharField(max_length=255)

    #  IMAGE UPLOAD
    image = models.ImageField(upload_to="properties/")

    #  VIRTUAL TOUR LINK
    virtual_tour_url = models.URLField()

    is_available = models.BooleanField(default=True)
    available_from = models.DateField(null=True, blank=True)

    # ⭐ RATING & REVIEWS (NO NEW MODEL)
    total_rating = models.IntegerField(default=0)  # Sum of all stars
    rating_count = models.IntegerField(default=0)  # Number of ratings
    # We'll store reviews as a JSON string to keep it simple and within the same model
    reviews_json = models.TextField(default="[]")

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title


# Rental request model
class RentalRequest(models.Model):
    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("APPROVED", "Approved"),
        ("REJECTED", "Rejected"),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE)
    property = models.ForeignKey(Property, on_delete=models.CASCADE)

    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="PENDING")

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user} → {self.property} ({self.status})"


# savedProperty model
class SavedProperty(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    property = models.ForeignKey(Property, on_delete=models.CASCADE)


# Notification model
class Notification(models.Model):
    TYPE_CHOICES = [
        ("RENT_REQUEST", "Rent Request"),
        ("CONTRACT", "Contract"),
        ("GENERAL", "General"),
    ]

    user = models.ForeignKey("User", on_delete=models.CASCADE)
    message = models.TextField()

    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default="GENERAL")

    is_read = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.type} - {'Read' if self.is_read else 'Unread'}"


# Contract model
class Contract(models.Model):
    STATUS_CHOICES = [
        ("SENT", "Sent"),
        ("SIGNED", "Signed"),
    ]

    user = models.ForeignKey("User", on_delete=models.CASCADE)
    property = models.ForeignKey("Property", on_delete=models.CASCADE)

    # Automated contract details
    rent_amount = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True
    )
    terms = models.TextField(blank=True)
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="SENT")

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Contract for {self.user} - {self.property}"
