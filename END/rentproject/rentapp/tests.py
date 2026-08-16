from datetime import date, timedelta
from decimal import Decimal
from unittest.mock import patch

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone

from .models import Property, Reservation
from .views import release_reservation_for_failed_payment

class PaymentFlowTests(TestCase):
    def setUp(self):
        self.owner = get_user_model().objects.create_user(
            username="owner",
            password="testpass123",
        )
        self.customer = get_user_model().objects.create_user(
            username="customer",
            password="testpass123",
        )
        self.property = Property.objects.create(
            owner=self.owner,
            title="Test House",
            description="A place to stay",
            price=Decimal("150000"),
            location="Dar es Salaam",
            image=SimpleUploadedFile("house.png", b"fake-image", content_type="image/png"),
            status=Property.STATUS_RESERVED,
            is_available=False,
        )
        self.reservation = Reservation.objects.create(
            customer=self.customer,
            property=self.property,
            start_date=date(2026, 1, 1),
            end_date=date(2026, 2, 1),
            monthly_price=self.property.price,
            total_months=1,
            total_amount=Decimal("150000"),
            expiry_time=timezone.now() + timedelta(hours=24),
            reservation_status=Reservation.STATUS_PAYMENT_PROCESSING,
        )

    def test_release_reservation_for_failed_payment_makes_property_available(self):
        release_reservation_for_failed_payment(self.reservation)

        self.reservation.refresh_from_db()
        self.property.refresh_from_db()

        self.assertEqual(self.reservation.reservation_status, Reservation.STATUS_PENDING_PAYMENT)
        self.assertEqual(self.property.status, Property.STATUS_AVAILABLE)
        self.assertTrue(self.property.is_available)

