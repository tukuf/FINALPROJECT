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
]
