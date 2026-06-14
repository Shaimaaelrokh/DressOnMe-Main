from django.db import models
from django.conf import settings
import os

def makeup_history_path(instance, filename):
    return f'makeup_history/{instance.user.id}/{filename}'

class MakeupHistory(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='makeup_history')
    result_image = models.ImageField(upload_to=makeup_history_path)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Makeup try-on for {self.user.email} at {self.created_at}"
