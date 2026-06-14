from rest_framework import serializers
from .models import MakeupHistory

class MakeupHistorySerializer(serializers.ModelSerializer):
    class Meta:
        model = MakeupHistory
        fields = ['id', 'user', 'result_image', 'created_at']
        read_only_fields = ['id', 'user', 'created_at']
