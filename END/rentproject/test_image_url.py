import os
import django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "rentproject.settings")
django.setup()
from rentapp.models import Property360Image
img = Property360Image.objects.first()
print(f"URL: {img.image.url}")
