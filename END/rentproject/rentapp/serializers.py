import json

from rest_framework import serializers

from .models import *


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = "__all__"
        read_only_fields = ["role"]


class PropertySerializer(serializers.ModelSerializer):
    next_available_date = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()
    reviews = serializers.SerializerMethodField()

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
        return rep
