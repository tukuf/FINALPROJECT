from datetime import date, timedelta

from django.contrib.auth import authenticate, login
from django.contrib.auth.hashers import make_password
from django.shortcuts import render
from django.utils import timezone
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

# Create your views here.
from .models import *
from .models import User
from .serializers import *


def auto_update_property_availability():
    """Check all occupied properties and auto-make available if the current date
    is equal to or past the property's next available date (latest contract end_date
    or latest approved RentalRequest end_date)."""
    today = date.today()
    occupied_properties = Property.objects.filter(is_available=False)
    for prop in occupied_properties:
        # Find the latest end_date from contracts
        latest_contract = (
            Contract.objects.filter(property=prop)
            .order_by("-end_date")
            .first()
        )
        latest_date = None
        if latest_contract and latest_contract.end_date:
            latest_date = latest_contract.end_date

        # Also check approved RentalRequests
        latest_approved_request = (
            RentalRequest.objects.filter(property=prop, status="APPROVED")
            .order_by("-end_date")
            .first()
        )
        if latest_approved_request and latest_approved_request.end_date:
            if latest_date is None or latest_approved_request.end_date > latest_date:
                latest_date = latest_approved_request.end_date

        if latest_date and today >= latest_date:
            prop.is_available = True
            prop.save(update_fields=["is_available"])

# ===============================
# 🔁 GENERIC CRUD API
# ===============================


@api_view(["POST"])
def register(request):
    data = request.data

    try:
        user = User.objects.create(
            username=data["username"],
            email=data["email"],
            password=make_password(data["password"]),
            phone=data.get("phone", ""),
            address=data.get("address", ""),
            first_name=data.get("first_name", ""),
            last_name=data.get("last_name", ""),
        )
        return Response({"message": "User created successfully"}, status=201)
    except Exception as e:
        return Response({"error": str(e)}, status=400)


def generic_api(model_class, serializer_class):

    @api_view(["GET", "POST", "PUT", "PATCH", "DELETE"])
    @permission_classes([IsAuthenticated])
    def api(request, id=None):

        user = request.user

        # 🔹 GET (SAFE FILTERING)
        if request.method == "GET":
            if id:
                try:
                    instance = model_class.objects.get(id=id)

                    # Auto-update availability for properties
                    if model_class == Property:
                        auto_update_property_availability()
                        instance.refresh_from_db()

                    # 🔐 Ownership check
                    is_owner = (
                        hasattr(instance, "user") and instance.user == user
                    ) or (hasattr(instance, "owner") and instance.owner == user)

                    if not is_owner and not user.is_staff:
                        # Special case: everyone can see properties
                        if model_class != Property:
                            return Response({"error": "Unauthorized"}, status=403)

                    serializer = serializer_class(
                        instance, context={"request": request}
                    )
                    return Response(serializer.data)

                except model_class.DoesNotExist:
                    return Response({"error": "Not found"}, status=404)

            else:
                # Auto-update availability for properties before returning list
                if model_class == Property:
                    auto_update_property_availability()

                # 🔐 Admin sees all EXCEPT for notifications (only see their own)
                if user.is_staff:
                    if model_class == Notification:
                        queryset = model_class.objects.filter(user=user)
                    else:
                        queryset = model_class.objects.all()

                # 🔓 Properties can be seen by everyone
                elif model_class == Property:
                    queryset = model_class.objects.all()

                else:
                    # 🔐 User sees only their data
                    if hasattr(model_class, "user"):
                        queryset = model_class.objects.filter(user=user)
                    elif hasattr(model_class, "owner"):
                        queryset = model_class.objects.filter(owner=user)
                    else:
                        queryset = model_class.objects.none()

                serializer = serializer_class(
                    queryset, many=True, context={"request": request}
                )
                return Response(serializer.data)

        # 🔹 POST (AUTO ASSIGN USER)
        elif request.method == "POST":
            serializer = serializer_class(
                data=request.data, context={"request": request}
            )

            if serializer.is_valid():
                # For models with a 'user' field
                if hasattr(model_class, "user"):
                    # If the field is already in validated_data (and requester is staff), use it
                    # Otherwise, auto-assign to current requester
                    if "user" in serializer.validated_data and request.user.is_staff:
                        serializer.save()
                    else:
                        serializer.save(user=user)

                elif hasattr(model_class, "owner"):
                    serializer.save(owner=user)

                else:
                    serializer.save()

                return Response(serializer.data)

            return Response(serializer.errors, status=400)

        # 🔹 PUT / PATCH (SAFE UPDATE)
        elif request.method in ["PUT", "PATCH"]:
            if not id:
                return Response({"error": "ID required"}, status=400)

            try:
                instance = model_class.objects.get(id=id)

                # 🔐 Ownership check
                is_owner = (hasattr(instance, "user") and instance.user == user) or (
                    hasattr(instance, "owner") and instance.owner == user
                )

                # Special case: allow users to update property ratings even if they aren't the owner
                is_rating_update = (
                    model_class == Property
                    and request.method in ["PUT", "PATCH"]
                    and all(
                        k in ["total_rating", "rating_count", "reviews_json"]
                        for k in request.data.keys()
                    )
                )

                if not is_owner and not user.is_staff and not is_rating_update:
                    return Response({"error": "Unauthorized"}, status=403)

                # Set partial=True for PATCH
                partial = request.method == "PATCH"
                serializer = serializer_class(
                    instance,
                    data=request.data,
                    context={"request": request},
                    partial=partial,
                )

                if serializer.is_valid():
                    old_status = (
                        instance.status if hasattr(instance, "status") else None
                    )
                    updated_instance = serializer.save()
                    new_status = (
                        updated_instance.status
                        if hasattr(updated_instance, "status")
                        else None
                    )

                    # 🔥 Logic: If a contract is signed, notify the owner
                    if (
                        model_class == Contract
                        and old_status == "SENT"
                        and new_status == "SIGNED"
                    ):
                        owner = updated_instance.property.owner
                        Notification.objects.create(
                            user=owner,
                            message=f"Client {updated_instance.user.username} has signed the contract for {updated_instance.property.title}",
                            type="CONTRACT",
                        )

                    return Response(serializer.data)

                return Response(serializer.errors, status=400)

            except model_class.DoesNotExist:
                return Response({"error": "Not found"}, status=404)

        # 🔹 DELETE (SAFE DELETE)
        elif request.method == "DELETE":
            if not id:
                return Response({"error": "ID required"}, status=400)

            try:
                instance = model_class.objects.get(id=id)

                # 🔐 Ownership check
                is_owner = (hasattr(instance, "user") and instance.user == user) or (
                    hasattr(instance, "owner") and instance.owner == user
                )

                # Special case: allow users to update property ratings even if they aren't the owner
                is_rating_update = (
                    model_class == Property
                    and request.method in ["PUT", "PATCH"]
                    and all(
                        k in ["total_rating", "rating_count", "reviews_json"]
                        for k in request.data.keys()
                    )
                )

                if not is_owner and not user.is_staff and not is_rating_update:
                    return Response({"error": "Unauthorized"}, status=403)

                instance.delete()
                return Response({"message": "Deleted successfully"})

            except model_class.DoesNotExist:
                return Response({"error": "Not found"}, status=404)

    return api


# ===============================
# 🔹 GENERIC ENDPOINTS
# ===============================
manage_user = generic_api(User, UserSerializer)
manage_property = generic_api(Property, PropertySerializer)
manage_savedproperty = generic_api(SavedProperty, SavedPropertySerializer)
manage_notification = generic_api(Notification, NotificationSerializer)
manage_contract = generic_api(Contract, ContractSerializer)


# ===============================
# 🗑️  RENTAL REQUEST  (fully self-contained, with admin-delete notification)
# ===============================
@api_view(["GET", "POST", "PUT", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def manage_rentalrequest(request, id=None):
    """
    Self-contained CRUD for RentalRequest.
    Intercepts admin DELETE to send a notification to the customer
    before removing the record. All other logic mirrors the generic_api handler.
    """
    user = request.user

    # ── GET ──────────────────────────────────────────────────────────────
    if request.method == "GET":
        if id:
            try:
                instance = RentalRequest.objects.get(id=id)
                is_owner = instance.user == user
                if not is_owner and not user.is_staff:
                    return Response({"error": "Unauthorized"}, status=403)
                serializer = RentalRequestSerializer(instance, context={"request": request})
                return Response(serializer.data)
            except RentalRequest.DoesNotExist:
                return Response({"error": "Not found"}, status=404)
        else:
            if user.is_staff:
                queryset = RentalRequest.objects.all()
            else:
                queryset = RentalRequest.objects.filter(user=user)
            serializer = RentalRequestSerializer(queryset, many=True, context={"request": request})
            return Response(serializer.data)

    # ── POST ─────────────────────────────────────────────────────────────
    elif request.method == "POST":
        serializer = RentalRequestSerializer(data=request.data, context={"request": request})
        if serializer.is_valid():
            serializer.save(user=user)
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    # ── PUT / PATCH ───────────────────────────────────────────────────────
    elif request.method in ["PUT", "PATCH"]:
        if not id:
            return Response({"error": "ID required"}, status=400)
        try:
            instance = RentalRequest.objects.get(id=id)
            is_owner = instance.user == user
            if not is_owner and not user.is_staff:
                return Response({"error": "Unauthorized"}, status=403)
            partial = request.method == "PATCH"
            serializer = RentalRequestSerializer(
                instance, data=request.data, context={"request": request}, partial=partial
            )
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors, status=400)
        except RentalRequest.DoesNotExist:
            return Response({"error": "Not found"}, status=404)

    # ── DELETE ────────────────────────────────────────────────────────────
    elif request.method == "DELETE":
        if not id:
            return Response({"error": "ID required"}, status=400)
        try:
            instance = RentalRequest.objects.get(id=id)

            # Only admin or the request owner can delete
            is_owner = instance.user == user
            if not is_owner and not user.is_staff:
                return Response({"error": "Unauthorized"}, status=403)

            # 🔔 If admin is deleting → notify the customer
            if user.is_staff:
                Notification.objects.create(
                    user=instance.user,
                    message=(
                        f"Your rental request for '{instance.property.title}' has been removed "
                        f"by the administrator. "
                        f"The request was neither approved nor rejected — "
                        f"please contact us if you have any questions."
                    ),
                    type="RENT_REQUEST",
                )

            instance.delete()
            return Response({"message": "Rental request deleted successfully."})

        except RentalRequest.DoesNotExist:
            return Response({"error": "Request not found"}, status=404)



# ===============================
# 🔥 CUSTOM BUSINESS LOGIC
# ===============================


@api_view(["POST"])
def login_user(request):
    username = request.data.get("username")
    password = request.data.get("password")

    user = authenticate(username=username, password=password)

    if user:
        login(request, user)  # creates session
        token, created = Token.objects.get_or_create(user=user)

        # Determine role based on is_staff as requested
        role = "ADMIN" if user.is_staff else "CLIENT"

        return Response(
            {
                "message": "Login successful",
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "role": role,
                },
                "token": token.key,
            }
        )
    else:
        return Response({"error": "Invalid credentials"}, status=401)


# 🧍 CLIENT: Rent Property
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def rent_property(request, property_id):
    user = request.user

    try:
        property_obj = Property.objects.get(id=property_id)

        if property_obj.status == Property.STATUS_RESERVED:
            return Response({"message": "This property is currently reserved."}, status=400)
        if property_obj.status == Property.STATUS_OCCUPIED:
            return Response({"message": "This property is already occupied."}, status=400)

        # ❌ prevent duplicate request
        existing = RentalRequest.objects.filter(
            user=user, property=property_obj, status="PENDING"
        ).first()

        if existing:
            return Response(
                {"message": "You already requested this property"}, status=400
            )

        # ✅ create request
        RentalRequest.objects.create(
            user=user,
            property=property_obj,
            start_date=request.data.get("start_date"),
            end_date=request.data.get("end_date"),
        )

        # 🔔 notify admin
        admin = property_obj.owner

        Notification.objects.create(
            user=admin,
            message=f"{user.username} requested to rent {property_obj.title}",
            type="RENT_REQUEST",
        )

        return Response({"message": "Request sent successfully"})

    except Property.DoesNotExist:
        return Response({"error": "Property not found"}, status=404)


# 🔑 ADMIN: Approve / Reject Request
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def update_rentalrequest(request, id):
    try:
        rental_request = RentalRequest.objects.get(id=id)

        action = request.data.get("action")  # approve / reject

        if action == "approve":
            rental_request.status = "APPROVED"

            # make property unavailable
            rental_request.property.is_available = False
            rental_request.property.save()

            # notify client
            Notification.objects.create(
                user=rental_request.user,
                message=f"Your request for {rental_request.property.title} has been approved",
                type="RENT_REQUEST",
            )

        elif action == "reject":
            rental_request.status = "REJECTED"

            Notification.objects.create(
                user=rental_request.user,
                message=f"Your request for {rental_request.property.title} was rejected",
                type="RENT_REQUEST",
            )

        rental_request.save()

        return Response({"message": "Request updated successfully"})

    except RentalRequest.DoesNotExist:
        return Response({"error": "Request not found"}, status=404)


# ===============================
# 🏠 VIRTUAL TOUR APIs
# ===============================

# ── 360° Room images ──────────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def manage_tour_rooms(request, property_id):
    """
    GET  /api/property/<property_id>/tour/rooms/
         Any authenticated user can retrieve room list (clients need it to view the tour).
    POST /api/property/<property_id>/tour/rooms/
         Only the property owner can upload a new room image.
    """
    try:
        prop = Property.objects.get(id=property_id)
    except Property.DoesNotExist:
        return Response({"error": "Property not found"}, status=404)

    if request.method == "GET":
        rooms = Property360Image.objects.filter(property=prop)
        serializer = Property360ImageSerializer(rooms, many=True, context={"request": request})
        return Response(serializer.data)

    # POST – owner only
    if prop.owner != request.user:
        return Response({"error": "Unauthorized"}, status=403)

    serializer = Property360ImageSerializer(data=request.data, context={"request": request})
    if serializer.is_valid():
        serializer.save(property=prop)
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def manage_tour_room(request, property_id, room_id):
    """
    GET    /api/property/<property_id>/tour/rooms/<room_id>/
    PATCH  /api/property/<property_id>/tour/rooms/<room_id>/
    DELETE /api/property/<property_id>/tour/rooms/<room_id>/
    """
    try:
        prop = Property.objects.get(id=property_id)
        room = Property360Image.objects.get(id=room_id, property=prop)
    except Property.DoesNotExist:
        return Response({"error": "Property not found"}, status=404)
    except Property360Image.DoesNotExist:
        return Response({"error": "Room not found"}, status=404)

    if request.method == "GET":
        serializer = Property360ImageSerializer(room, context={"request": request})
        return Response(serializer.data)

    # Mutating actions – owner only
    if prop.owner != request.user:
        return Response({"error": "Unauthorized"}, status=403)

    if request.method == "PATCH":
        serializer = Property360ImageSerializer(
            room, data=request.data, partial=True, context={"request": request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    if request.method == "DELETE":
        room.delete()
        return Response({"message": "Room deleted successfully."})


# ── Hotspots ──────────────────────────────────────────────────────────────────

@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def manage_hotspots(request, property_id):
    """
    GET  /api/property/<property_id>/tour/hotspots/
         Any authenticated user can read hotspots.
    POST /api/property/<property_id>/tour/hotspots/
         Only the property owner can create a hotspot.
    """
    try:
        prop = Property.objects.get(id=property_id)
    except Property.DoesNotExist:
        return Response({"error": "Property not found"}, status=404)

    if request.method == "GET":
        hotspots = PropertyHotspot.objects.filter(source_room__property=prop)
        serializer = PropertyHotspotSerializer(hotspots, many=True, context={"request": request})
        return Response(serializer.data)

    # POST – owner only
    if prop.owner != request.user:
        return Response({"error": "Unauthorized"}, status=403)

    serializer = PropertyHotspotSerializer(data=request.data, context={"request": request})
    if serializer.is_valid():
        source_room = serializer.validated_data["source_room"]
        target_room = serializer.validated_data["target_room"]

        # Validate that both rooms belong to this property
        if source_room.property != prop or target_room.property != prop:
            return Response(
                {"error": "Both rooms must belong to this property."},
                status=400
            )
        if source_room == target_room:
            return Response(
                {"error": "Source and target rooms cannot be the same."},
                status=400
            )

        serializer.save()
        return Response(serializer.data, status=201)
    return Response(serializer.errors, status=400)


@api_view(["GET", "PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def manage_hotspot(request, property_id, hotspot_id):
    """
    GET    /api/property/<property_id>/tour/hotspots/<hotspot_id>/
    PATCH  /api/property/<property_id>/tour/hotspots/<hotspot_id>/
    DELETE /api/property/<property_id>/tour/hotspots/<hotspot_id>/
    """
    try:
        prop = Property.objects.get(id=property_id)
        hotspot = PropertyHotspot.objects.get(
            id=hotspot_id, source_room__property=prop
        )
    except Property.DoesNotExist:
        return Response({"error": "Property not found"}, status=404)
    except PropertyHotspot.DoesNotExist:
        return Response({"error": "Hotspot not found"}, status=404)

    if request.method == "GET":
        serializer = PropertyHotspotSerializer(hotspot, context={"request": request})
        return Response(serializer.data)

    # Mutating actions – owner only
    if prop.owner != request.user:
        return Response({"error": "Unauthorized"}, status=403)

    if request.method == "PATCH":
        serializer = PropertyHotspotSerializer(
            hotspot, data=request.data, partial=True, context={"request": request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    if request.method == "DELETE":
        hotspot.delete()
        return Response({"message": "Hotspot deleted successfully."})


# ── Full virtual tour payload ─────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_virtual_tour(request, property_id):
    """
    GET /api/property/<property_id>/tour/
    Returns the complete virtual tour: all rooms with their embedded hotspots.
    Accessible by any authenticated user (clients need it to navigate the tour).
    """
    try:
        prop = Property.objects.get(id=property_id)
    except Property.DoesNotExist:
        return Response({"error": "Property not found"}, status=404)

    rooms = Property360Image.objects.filter(property=prop).prefetch_related("hotspots")
    serializer = Property360ImageSerializer(rooms, many=True, context={"request": request})

    initial_room = rooms.filter(is_initial_room=True).first()
    initial_room_id = (
        initial_room.id if initial_room else (rooms.first().id if rooms.exists() else None)
    )

    return Response({
        "property_id": prop.id,
        "property_title": prop.title,
        "initial_room_id": initial_room_id,
        "rooms": serializer.data,
    })


# ===============================
# 📊 UNIQUE CUSTOMER REVIEW TRACKING
# ===============================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def record_visit(request, property_id):
    """
    POST /api/property/<property_id>/record-visit/
    Records a unique customer visit to a property.
    Only authenticated CLIENT accounts are counted.
    Admin accounts are ignored.
    Duplicate visits by the same customer are prevented.
    """
    user = request.user

    # Admin accounts must not affect the review count
    if user.is_staff:
        return Response({"message": "Admin accounts are not counted", "count": 0})

    try:
        prop = Property.objects.get(id=property_id)
    except Property.DoesNotExist:
        return Response({"error": "Property not found"}, status=404)

    # get_or_create ensures no duplicate records
    _, created = PropertyReviewVisitor.objects.get_or_create(
        user=user,
        property=prop,
    )

    # ALWAYS recount to self-heal any out-of-sync counters
    new_count = PropertyReviewVisitor.objects.filter(property=prop).count()
    if prop.unique_review_count != new_count:
        Property.objects.filter(id=property_id).update(unique_review_count=new_count)
        prop.unique_review_count = new_count

    return Response({
        "message": "Visit recorded" if created else "Already recorded",
        "count": prop.unique_review_count,
    })


# ===============================
# 🏷️ RESERVATION APIs
# ===============================

def auto_expire_reservations():
    """
    Called on every reservation read. Expires any RESERVED reservations
    whose expiry_time has passed, restores property status to Available,
    and sends the customer a notification. No cron job required.
    Also sends 'expiring soon' notifications if within 1 hour of expiry.
    """
    now = timezone.now()

    # 1. Expire reservations
    expired_reservations = Reservation.objects.filter(
        reservation_status=Reservation.STATUS_RESERVED,
        expiry_time__lte=now,
    )
    for reservation in expired_reservations:
        reservation.reservation_status = Reservation.STATUS_EXPIRED
        reservation.save(update_fields=["reservation_status"])

        # Restore property status to Available
        prop = reservation.property
        # Only restore if this is still the active reservation for this property
        if prop.status == Property.STATUS_RESERVED:
            prop.status = Property.STATUS_AVAILABLE
            prop.is_available = True
            prop.save(update_fields=["status", "is_available"])

        # Notify customer
        Notification.objects.create(
            user=reservation.customer,
            message=(
                f"Your 24-hour reservation for '{prop.title}' has expired. "
                f"The property is now available again. You may reserve it again at any time."
            ),
            type="GENERAL",
        )

    # 2. Notify expiring soon (within 1 hour)
    one_hour_from_now = now + timedelta(hours=1)
    expiring_soon = Reservation.objects.filter(
        reservation_status=Reservation.STATUS_RESERVED,
        expiry_time__lte=one_hour_from_now,
        expiry_time__gt=now,
        expiring_soon_notified=False
    )
    for reservation in expiring_soon:
        reservation.expiring_soon_notified = True
        reservation.save(update_fields=["expiring_soon_notified"])

        # Notify customer
        Notification.objects.create(
            user=reservation.customer,
            message=(
                f"Your reservation for '{reservation.property.title}' expires in less than 1 hour. "
                f"Please complete your payment to secure the property."
            ),
            type="GENERAL",
        )


@api_view(["GET", "POST"])
@permission_classes([IsAuthenticated])
def manage_reservation(request):
    """
    GET  /api/reservation/   – list the authenticated customer's reservations
    POST /api/reservation/   – create a new reservation (customers only)
    """
    user = request.user
    auto_expire_reservations()

    # ── GET ──────────────────────────────────────────────────────────────
    if request.method == "GET":
        if user.is_staff:
            # Admins see all reservations
            queryset = Reservation.objects.all()
        else:
            queryset = Reservation.objects.filter(customer=user)
        serializer = ReservationSerializer(queryset, many=True, context={"request": request})
        return Response(serializer.data)

    # ── POST (create) ─────────────────────────────────────────────────────
    if request.method == "POST":
        if user.is_staff:
            return Response({"error": "Admins cannot make reservations."}, status=403)

        data = request.data
        property_id = data.get("property_id")
        start_date = data.get("start_date")
        end_date = data.get("end_date")

        if not all([property_id, start_date, end_date]):
            return Response({"error": "property_id, start_date, and end_date are required."}, status=400)

        try:
            prop = Property.objects.get(id=property_id)
        except Property.DoesNotExist:
            return Response({"error": "Property not found."}, status=404)

        # Block if property is already Reserved or Occupied
        if prop.status == Property.STATUS_RESERVED:
            return Response(
                {"error": "This property is currently reserved by another customer."},
                status=400,
            )
        if prop.status == Property.STATUS_OCCUPIED:
            return Response(
                {"error": "This property is currently occupied."},
                status=400,
            )

        # Prevent duplicate active reservations by same customer on same property
        existing = Reservation.objects.filter(
            customer=user,
            property=prop,
            reservation_status=Reservation.STATUS_RESERVED,
        ).first()
        if existing:
            return Response(
                {"error": "You already have an active reservation for this property."},
                status=400,
            )

        # Calculate months & total
        try:
            from datetime import date as date_type
            sd = date_type.fromisoformat(str(start_date))
            ed = date_type.fromisoformat(str(end_date))
        except ValueError:
            return Response({"error": "Invalid date format. Use YYYY-MM-DD."}, status=400)

        if ed <= sd:
            return Response({"error": "End date must be after start date."}, status=400)

        total_months = (ed.year - sd.year) * 12 + (ed.month - sd.month)
        if total_months < 1:
            total_months = 1

        monthly_price = prop.price
        total_amount = monthly_price * total_months

        expiry_dt = timezone.now() + timedelta(hours=24)

        reservation = Reservation.objects.create(
            customer=user,
            property=prop,
            start_date=sd,
            end_date=ed,
            monthly_price=monthly_price,
            total_months=total_months,
            total_amount=total_amount,
            expiry_time=expiry_dt,
            reservation_status=Reservation.STATUS_RESERVED,
        )

        # Change property status to Reserved
        prop.status = Property.STATUS_RESERVED
        prop.is_available = False
        prop.save(update_fields=["status", "is_available"])

        # Notify customer
        Notification.objects.create(
            user=user,
            message=(
                f"Your reservation for '{prop.title}' is confirmed! "
                f"You have 24 hours (until {expiry_dt.strftime('%Y-%m-%d %H:%M')}) "
                f"to complete your payment. Total amount: ${total_amount}."
            ),
            type="GENERAL",
        )

        # Notify admin/owner
        Notification.objects.create(
            user=prop.owner,
            message=(
                f"{user.username} has reserved '{prop.title}' for "
                f"{sd} – {ed} (Total: ${total_amount}). "
                f"Reservation expires at {expiry_dt.strftime('%Y-%m-%d %H:%M')}."
            ),
            type="RENT_REQUEST",
        )

        serializer = ReservationSerializer(reservation, context={"request": request})
        return Response(serializer.data, status=201)


@api_view(["GET", "DELETE"])
@permission_classes([IsAuthenticated])
def manage_reservation_detail(request, reservation_id):
    """
    GET    /api/reservation/<id>/   – retrieve a single reservation
    DELETE /api/reservation/<id>/   – cancel a reservation
    """
    user = request.user
    auto_expire_reservations()

    try:
        reservation = Reservation.objects.get(id=reservation_id)
    except Reservation.DoesNotExist:
        return Response({"error": "Reservation not found."}, status=404)

    # Access control
    is_owner = reservation.customer == user
    if not is_owner and not user.is_staff:
        return Response({"error": "Unauthorized."}, status=403)

    if request.method == "GET":
        serializer = ReservationSerializer(reservation, context={"request": request})
        return Response(serializer.data)

    if request.method == "DELETE":
        if reservation.reservation_status not in [Reservation.STATUS_RESERVED, Reservation.STATUS_PENDING_PAYMENT]:
            return Response({"error": "Only active reservations can be cancelled."}, status=400)

        prop = reservation.property

        reservation.reservation_status = Reservation.STATUS_CANCELLED
        reservation.save(update_fields=["reservation_status"])

        # Restore property status
        if prop.status == Property.STATUS_RESERVED:
            prop.status = Property.STATUS_AVAILABLE
            prop.is_available = True
            prop.save(update_fields=["status", "is_available"])

        Notification.objects.create(
            user=reservation.customer,
            message=f"Your reservation for '{prop.title}' has been cancelled.",
            type="GENERAL",
        )

        return Response({"message": "Reservation cancelled successfully."})


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def check_reservation_expiry(request):
    """
    POST /api/reservation/check-expiry/
    Trigger expiry check manually (can be called by frontend on load).
    """
    auto_expire_reservations()
    return Response({"message": "Expiry check complete."})


# ===============================
# 💳 PAYMENT APIs (PLACEHOLDERS)
# ===============================

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def initiate_mobile_payment(request):
    """
    POST /api/payment/initiate/
    Placeholder for initiating a mobile money payment.
    """
    data = request.data
    reservation_id = data.get("reservation_id")
    payment_method = data.get("payment_method")
    phone_number = data.get("phone_number")
    amount = data.get("amount")

    if not all([reservation_id, payment_method, phone_number, amount]):
        return Response({"error": "Missing payment fields."}, status=400)

    try:
        reservation = Reservation.objects.get(id=reservation_id)
    except Reservation.DoesNotExist:
        return Response({"error": "Reservation not found."}, status=404)

    if reservation.reservation_status != Reservation.STATUS_RESERVED:
        return Response({"error": "Only reserved properties can be paid for."}, status=400)

    # 1. Create Payment Record (Pending)
    payment = Payment.objects.create(
        reservation=reservation,
        payment_method=payment_method,
        phone_number=phone_number,
        amount=amount,
        payment_status=Payment.STATUS_PENDING
    )

    reservation.reservation_status = Reservation.STATUS_PAYMENT_PROCESSING
    reservation.save(update_fields=["reservation_status"])

    # Notify Customer - Payment Initiated
    Notification.objects.create(
        user=request.user,
        message=f"Payment of ${amount} for '{reservation.property.title}' initiated via {payment_method}.",
        type="GENERAL",
    )

    # ==============================================================
    # 🚀 TODO: MOBILE MONEY API INTEGRATION WILL BE IMPLEMENTED HERE
    # ==============================================================
    # 1. Prepare payload with API credentials.
    # 2. Make request to payment gateway (M-Pesa, Airtel Money, etc.).
    # 3. Handle response and redirect user if necessary.
    
    # ⚠️ MOCKING SUCCESSFUL PAYMENT FOR UI FLOW ONLY
    payment.payment_status = Payment.STATUS_SUCCESSFUL
    payment.transaction_id = f"MOCK_TXN_{payment.id}"
    payment.save()

    reservation.reservation_status = Reservation.STATUS_PAID
    reservation.save(update_fields=["reservation_status"])

    # Notify Customer - Payment Successful
    Notification.objects.create(
        user=request.user,
        message=f"Payment successful! You have paid ${amount} for '{reservation.property.title}'. Waiting for admin approval.",
        type="GENERAL",
    )

    # Also, we might create a Contract or RentalRequest here, but the 
    # requirements say to not ask the customer to fill rental details again.
    # We will automatically create an approved RentalRequest or Contract 
    # based on the reservation. The instructions say "Pending Approval" or "Approved".
    # For now, let's keep it in "Paid" state or "Pending Approval".
    reservation.reservation_status = Reservation.STATUS_PENDING_APPROVAL
    reservation.save(update_fields=["reservation_status"])

    return Response({
        "message": "Mobile Money API integration will be implemented here.",
        "payment": PaymentSerializer(payment).data
    })


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def verify_payment_status(request, payment_id):
    """
    GET /api/payment/verify/<id>/
    Placeholder for verifying payment status.
    """
    try:
        payment = Payment.objects.get(id=payment_id)
    except Payment.DoesNotExist:
        return Response({"error": "Payment not found."}, status=404)

    # ==============================================================
    # 🚀 TODO: PAYMENT STATUS VERIFICATION WILL BE IMPLEMENTED HERE
    # ==============================================================
    # 1. Request transaction status from payment gateway using transaction_id.
    # 2. Update payment and reservation status based on gateway response.
    
    return Response(PaymentSerializer(payment).data)


@api_view(["POST"])
def payment_callback_handler(request):
    """
    POST /api/payment/callback/
    Placeholder for payment gateway webhooks.
    """
    # ==============================================================
    # 🚀 TODO: CALLBACK URL LOGIC WILL BE IMPLEMENTED HERE
    # ==============================================================
    # 1. Receive and parse gateway payload.
    # 2. Verify callback signature.
    # 3. Find matching Payment record.
    # 4. Update Payment and Reservation status (Success/Failed).
    # 5. Send notifications:
    #    - Payment successful
    #    - Payment failed
    #    - Rental approved
    #    - Rental completed
    
    return Response({"message": "Callback received."})

