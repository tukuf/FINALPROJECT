from django.contrib import admin
from .models import *

# Register your models here.

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['username', 'email', 'role', 'is_staff']
    list_filter = ['role']
    search_fields = ['username', 'email']

@admin.register(Property)
class PropertyAdmin(admin.ModelAdmin):
    list_display = ['title', 'price', 'location', 'status', 'is_available', 'created_at']
    list_filter = ['status', 'is_available']
    search_fields = ['title', 'location']

@admin.register(RentalRequest)
class RentalRequestAdmin(admin.ModelAdmin):
    list_display = ['user', 'property', 'status', 'created_at']
    list_filter = ['status']

@admin.register(SavedProperty)
class SavedPropertyAdmin(admin.ModelAdmin):
    list_display = ['user', 'property']

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ['user', 'message', 'is_read', 'created_at']
    list_filter = ['is_read']

@admin.register(Contract)
class ContractAdmin(admin.ModelAdmin):
    list_display = ['user', 'property', 'start_date', 'end_date', 'created_at']


# ============================
# 🏠 VIRTUAL TOUR ADMIN
# ============================

class PropertyHotspotInline(admin.TabularInline):
    model = PropertyHotspot
    fk_name = "source_room"
    extra = 0
    fields = ["title", "target_room", "pitch", "yaw"]


@admin.register(Property360Image)
class Property360ImageAdmin(admin.ModelAdmin):
    list_display = ["room_name", "property", "is_initial_room", "order", "created_at"]
    list_filter = ["is_initial_room", "property"]
    search_fields = ["room_name", "property__title"]
    ordering = ["property", "order"]
    inlines = [PropertyHotspotInline]


@admin.register(PropertyHotspot)
class PropertyHotspotAdmin(admin.ModelAdmin):
    list_display = ["title", "source_room", "target_room", "pitch", "yaw", "created_at"]
    list_filter = ["source_room__property"]
    search_fields = ["title", "source_room__room_name", "target_room__room_name"]


# ============================
# 📊 UNIQUE CUSTOMER REVIEW TRACKING
# ============================

@admin.register(PropertyReviewVisitor)
class PropertyReviewVisitorAdmin(admin.ModelAdmin):
    list_display = ["user", "property", "first_visited_at"]
    list_filter = ["property"]
    search_fields = ["user__username", "property__title"]
    readonly_fields = ["first_visited_at"]


# ============================
# 🏷️ RESERVATION ADMIN
# ============================

@admin.register(Reservation)
class ReservationAdmin(admin.ModelAdmin):
    list_display = [
        "id", "customer", "property", "reservation_status",
        "start_date", "end_date", "total_amount",
        "reservation_time", "expiry_time",
    ]
    list_filter = ["reservation_status"]
    search_fields = ["customer__username", "property__title"]
    readonly_fields = ["reservation_time"]
    ordering = ["-reservation_time"]


# ============================
# 💳 PAYMENT ADMIN
# ============================

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = [
        "id", "reservation", "payment_method", "phone_number",
        "amount", "payment_status", "created_at",
    ]
    list_filter = ["payment_status", "payment_method"]
    search_fields = ["phone_number", "transaction_id", "reservation__customer__username"]
    readonly_fields = ["created_at"]
    ordering = ["-created_at"]