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
    # Property availability status
    STATUS_AVAILABLE = "Available"
    STATUS_RESERVED = "Reserved"
    STATUS_OCCUPIED = "Occupied"
    STATUS_CHOICES = [
        (STATUS_AVAILABLE, "Available"),
        (STATUS_RESERVED, "Reserved"),
        (STATUS_OCCUPIED, "Occupied"),
    ]

    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name="properties")

    title = models.CharField(max_length=255)
    description = models.TextField()
    price = models.DecimalField(max_digits=10, decimal_places=2)
    location = models.CharField(max_length=255)

    #  IMAGE UPLOAD
    image = models.ImageField(upload_to="properties/")

    is_available = models.BooleanField(default=True)
    available_from = models.DateField(null=True, blank=True)

    # 🏷️ Property status (Available / Reserved / Occupied)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default=STATUS_AVAILABLE,
    )

    # ⭐ RATING & REVIEWS (NO NEW MODEL)
    total_rating = models.IntegerField(default=0)  # Sum of all stars
    rating_count = models.IntegerField(default=0)  # Number of ratings
    # We'll store reviews as a JSON string to keep it simple and within the same model
    reviews_json = models.TextField(default="[]")

    # Unique customer review counter
    unique_review_count = models.IntegerField(default=0)

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


# =======================
# 🏠 VIRTUAL TOUR MODELS
# =======================

def tour_image_upload_path(instance, filename):
    """Organizes 360° images into property-specific folders."""
    return f"virtual_tours/property_{instance.property.id}/rooms/{filename}"


class Property360Image(models.Model):
    """Stores a single 360° room image for a property."""
    property = models.ForeignKey(
        Property,
        on_delete=models.CASCADE,
        related_name="rooms"
    )
    room_name = models.CharField(max_length=100)
    image = models.ImageField(upload_to=tour_image_upload_path)
    is_initial_room = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["order", "created_at"]

    def __str__(self):
        return f"{self.room_name} – Property #{self.property.id}"

    def save(self, *args, **kwargs):
        """Ensure only one initial room per property."""
        if self.is_initial_room:
            Property360Image.objects.filter(
                property=self.property,
                is_initial_room=True
            ).exclude(pk=self.pk).update(is_initial_room=False)
        super().save(*args, **kwargs)


class PropertyHotspot(models.Model):
    """Defines a navigation hotspot connecting one room to another."""
    source_room = models.ForeignKey(
        Property360Image,
        on_delete=models.CASCADE,
        related_name="hotspots"
    )
    target_room = models.ForeignKey(
        Property360Image,
        on_delete=models.CASCADE,
        related_name="incoming_hotspots"
    )
    title = models.CharField(max_length=100)

    # Hotspot positioning (pitch/yaw for 360 viewers)
    pitch = models.FloatField(default=0.0)   # Vertical angle  (-90 to 90)
    yaw   = models.FloatField(default=0.0)   # Horizontal angle (-180 to 180)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]
        # Prevent duplicate hotspots between the same pair of rooms
        unique_together = [("source_room", "target_room")]

    def __str__(self):
        return f"Hotspot '{self.title}': {self.source_room.room_name} → {self.target_room.room_name}"


# ===============================
# 📊 UNIQUE CUSTOMER REVIEW TRACKING
# ===============================

class PropertyReviewVisitor(models.Model):
    """Tracks unique customer accounts that have interacted with a property.
    Each customer can only be counted once per property."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="property_visits")
    property = models.ForeignKey(Property, on_delete=models.CASCADE, related_name="review_visitors")
    first_visited_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = [("user", "property")]
        ordering = ["-first_visited_at"]

    def __str__(self):
        return f"{self.user.username} visited {self.property.title}"


# ===============================
# 🏷️ PROPERTY RESERVATION MODEL
# ===============================

class Reservation(models.Model):
    STATUS_RESERVED = "RESERVED"
    STATUS_PENDING_PAYMENT = "PENDING_PAYMENT"
    STATUS_PAYMENT_PROCESSING = "PAYMENT_PROCESSING"
    STATUS_PAID = "PAID"
    STATUS_PENDING_APPROVAL = "PENDING_APPROVAL"
    STATUS_APPROVED = "APPROVED"
    STATUS_EXPIRED = "EXPIRED"
    STATUS_CANCELLED = "CANCELLED"

    RESERVATION_STATUS_CHOICES = [
        (STATUS_RESERVED, "Reserved"),
        (STATUS_PENDING_PAYMENT, "Pending Payment"),
        (STATUS_PAYMENT_PROCESSING, "Payment Processing"),
        (STATUS_PAID, "Paid"),
        (STATUS_PENDING_APPROVAL, "Pending Approval"),
        (STATUS_APPROVED, "Approved"),
        (STATUS_EXPIRED, "Expired"),
        (STATUS_CANCELLED, "Cancelled"),
    ]

    customer = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="reservations",
    )
    property = models.ForeignKey(
        Property,
        on_delete=models.CASCADE,
        related_name="reservations",
    )

    start_date = models.DateField()
    end_date = models.DateField()
    monthly_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_months = models.PositiveIntegerField(default=1)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2)

    reservation_time = models.DateTimeField(auto_now_add=True)
    expiry_time = models.DateTimeField()  # reservation_time + 24 hours

    expiring_soon_notified = models.BooleanField(default=False)

    reservation_status = models.CharField(
        max_length=20,
        choices=RESERVATION_STATUS_CHOICES,
        default=STATUS_RESERVED,
    )

    class Meta:
        ordering = ["-reservation_time"]

    def __str__(self):
        return (
            f"Reservation #{self.id} – {self.customer.username} "
            f"→ {self.property.title} ({self.reservation_status})"
        )

    def is_active(self):
        """Returns True if this reservation is still within its 24-hour window."""
        from django.utils import timezone as tz
        return (
            self.reservation_status == self.STATUS_RESERVED
            and self.expiry_time > tz.now()
        )


# ===============================
# 💳 PAYMENT MODEL (PLACEHOLDER)
# ===============================

class Payment(models.Model):
    STATUS_PENDING = "PENDING"
    STATUS_SUCCESSFUL = "SUCCESSFUL"
    STATUS_FAILED = "FAILED"

    PAYMENT_STATUS_CHOICES = [
        (STATUS_PENDING, "Pending"),
        (STATUS_SUCCESSFUL, "Successful"),
        (STATUS_FAILED, "Failed"),
    ]

    reservation = models.OneToOneField(
        Reservation,
        on_delete=models.CASCADE,
        related_name="payment"
    )
    payment_method = models.CharField(max_length=50)
    phone_number = models.CharField(max_length=20)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_status = models.CharField(
        max_length=20,
        choices=PAYMENT_STATUS_CHOICES,
        default=STATUS_PENDING
    )
    transaction_id = models.CharField(max_length=100, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"Payment for Reservation #{self.reservation.id} - {self.payment_status}"
