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
    list_display = ['title', 'price', 'location', 'is_available', 'created_at']
    list_filter = ['is_available']
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