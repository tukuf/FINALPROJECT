from django.urls import path
from rest_framework.authtoken.views import obtain_auth_token

from .views import *

urlpatterns = [
    path("login/", login_user),
    path("register/", register),
    path("api-token/", obtain_auth_token),
    path("user/", manage_user),
    path("user/<int:id>/", manage_user),
    # PROPERTY
    path("property/", manage_property),
    path("property/<int:id>/", manage_property),
    path("property/<int:property_id>/rent/", rent_property),
    path("property/<int:property_id>/record-visit/", record_visit),
    # 📩 RENTAL REQUEST
    path("rental_request/", manage_rentalrequest),
    path("rental_request/<int:id>/", manage_rentalrequest),
    path("rental-request/<int:id>/update/", update_rentalrequest),
    # ❤️ SAVED PROPERTY
    path("saved_property/", manage_savedproperty),
    path("saved_property/<int:id>/", manage_savedproperty),
    # 🔔 NOTIFICATIONS
    path("notification/", manage_notification),
    path("notification/<int:id>/", manage_notification),
    # 📄 CONTRACT
    path("contract/", manage_contract),
    path("contract/<int:id>/", manage_contract),
    # 🏠 VIRTUAL TOUR
    path("property/<int:property_id>/tour/", get_virtual_tour),
    path("property/<int:property_id>/tour/rooms/", manage_tour_rooms),
    path("property/<int:property_id>/tour/rooms/<int:room_id>/", manage_tour_room),
    path("property/<int:property_id>/tour/hotspots/", manage_hotspots),
    path("property/<int:property_id>/tour/hotspots/<int:hotspot_id>/", manage_hotspot),
    # 🏷️ RESERVATIONS
    path("reservation/", manage_reservation),
    path("reservation/<int:reservation_id>/", manage_reservation_detail),
    path("reservation/check-expiry/", check_reservation_expiry),
    # 💳 PAYMENTS
    path("payment/initiate/", initiate_mobile_payment),
    path("payment/verify/<int:payment_id>/", verify_payment_status),
    path("payment/callback/", payment_callback_handler),
]
