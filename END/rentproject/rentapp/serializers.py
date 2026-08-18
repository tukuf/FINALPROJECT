import json

from rest_framework import serializers

from .models import *


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = "__all__"
        read_only_fields = ["role"]


# ============================
# 🏠 VIRTUAL TOUR SERIALIZERS
# ============================

class PropertyHotspotSerializer(serializers.ModelSerializer):
    """Full hotspot detail, including navigable room ids."""
    source_room_id = serializers.PrimaryKeyRelatedField(
        source="source_room", queryset=Property360Image.objects.all()
    )
    target_room_id = serializers.PrimaryKeyRelatedField(
        source="target_room", queryset=Property360Image.objects.all()
    )

    class Meta:
        model = PropertyHotspot
        fields = [
            "id",
            "title",
            "source_room_id",
            "target_room_id",
            "pitch",
            "yaw",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class Property360ImageSerializer(serializers.ModelSerializer):
    """Serializer for a single 360° room, embedding its outgoing hotspots."""
    hotspots = PropertyHotspotSerializer(many=True, read_only=True)
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Property360Image
        fields = [
            "id",
            "property",
            "room_name",
            "image",
            "image_url",
            "is_initial_room",
            "order",
            "hotspots",
            "created_at",
        ]
        read_only_fields = ["id", "created_at", "property"]

    def get_image_url(self, obj):
        request = self.context.get("request")
        if obj.image and request:
            return request.build_absolute_uri(obj.image.url)
        return None


class PropertySerializer(serializers.ModelSerializer):
    next_available_date = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()
    reviews = serializers.SerializerMethodField()
    has_virtual_tour = serializers.SerializerMethodField()
    rooms_count = serializers.SerializerMethodField()

    class Meta:
        model = Property
        fields = "__all__"
        read_only_fields = ["owner"]

    def get_next_available_date(self, obj):
        if obj.is_available:
            return None
        # Check both Contract and approved RentalRequest for the latest end_date
        latest_date = None
        latest_contract = (
            Contract.objects.filter(property=obj).order_by("-end_date").first()
        )
        if latest_contract and latest_contract.end_date:
            latest_date = latest_contract.end_date
        latest_approved_request = (
            RentalRequest.objects.filter(property=obj, status="APPROVED")
            .order_by("-end_date")
            .first()
        )
        if latest_approved_request and latest_approved_request.end_date:
            if latest_date is None or latest_approved_request.end_date > latest_date:
                latest_date = latest_approved_request.end_date
        return latest_date

    def get_average_rating(self, obj):
        if obj.rating_count == 0:
            return 0
        return round(obj.total_rating / obj.rating_count, 1)

    def get_reviews(self, obj):
        try:
            return json.loads(obj.reviews_json)
        except:
            return []

    def get_has_virtual_tour(self, obj):
        return obj.rooms.exists()

    def get_rooms_count(self, obj):
        return obj.rooms.count()


class RentalRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = RentalRequest
        fields = "__all__"
        read_only_fields = ["user"]

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep["user"] = UserSerializer(instance.user, context=self.context).data
        rep["property"] = PropertySerializer(
            instance.property, context=self.context
        ).data
        return rep


class SavedPropertySerializer(serializers.ModelSerializer):
    class Meta:
        model = SavedProperty
        fields = "__all__"
        read_only_fields = ["user"]

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep["property"] = PropertySerializer(
            instance.property, context=self.context
        ).data
        return rep


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = "__all__"
        read_only_fields = ["user"]


class ContractSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contract
        fields = "__all__"

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep["user"] = UserSerializer(instance.user, context=self.context).data
        rep["property"] = PropertySerializer(
            instance.property, context=self.context
        ).data
        
        # Include payment reference if available
        payment_ref = "N/A"
        try:
            from rentapp.models import Payment
            payment = Payment.objects.filter(
                reservation__property=instance.property,
                reservation__customer=instance.user,
                payment_status=Payment.STATUS_SUCCESSFUL
            ).last()
            if payment and payment.transaction_id:
                payment_ref = payment.transaction_id
        except Exception:
            pass
        rep["payment_reference"] = payment_ref
        
        return rep


class ReservationSerializer(serializers.ModelSerializer):
    """Serializer for the Reservation model."""
    is_active = serializers.SerializerMethodField()
    time_remaining_seconds = serializers.SerializerMethodField()

    class Meta:
        model = Reservation
        fields = "__all__"
        read_only_fields = ["customer", "reservation_time", "expiry_time", "reservation_status"]

    def get_is_active(self, obj):
        return obj.is_active()

    def get_time_remaining_seconds(self, obj):
        from django.utils import timezone
        if obj.reservation_status != Reservation.STATUS_RESERVED:
            return 0
        delta = obj.expiry_time - timezone.now()
        return max(int(delta.total_seconds()), 0)

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        rep["customer"] = UserSerializer(instance.customer, context=self.context).data
        rep["property"] = PropertySerializer(instance.property, context=self.context).data
        return rep


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = [
            "id",
            "reservation",
            "payment_method",
            "phone_number",
            "amount",
            "payment_status",
            "provider_transaction_id",
            "transaction_id",
            "provider_status",
            "webhook_received_at",
            "updated_at",
            "created_at",
        ]
        read_only_fields = [
            "payment_status",
            "provider_transaction_id",
            "transaction_id",
            "provider_status",
            "webhook_received_at",
            "updated_at",
            "created_at",
        ]
