from django.contrib import admin
from .models import User, Medicine, Profile, StockAlert, StockItem

admin.site.register(User)
admin.site.register(StockItem)
admin.site.register(StockAlert)
admin.site.register(Medicine)
admin.site.register(Profile)
# admin.site.register(caregiver_patient)
# admin.site.register(family_member)
# admin.site.register(medicine_history)
