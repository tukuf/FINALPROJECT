from django.contrib.auth import authenticate, login
from django.contrib.auth.hashers import make_password
from django.shortcuts import render
from rest_framework.authtoken.models import Token
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

# Create your views here.
from .models import *
from .models import User
from .serializers import *

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
manage_rentalrequest = generic_api(RentalRequest, RentalRequestSerializer)
manage_savedproperty = generic_api(SavedProperty, SavedPropertySerializer)
manage_notification = generic_api(Notification, NotificationSerializer)
manage_contract = generic_api(Contract, ContractSerializer)


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
