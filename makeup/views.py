from rest_framework import viewsets, permissions
from .models import MakeupHistory
from .serializers import MakeupHistorySerializer

class MakeupHistoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing and creating makeup try-on history.
    """
    serializer_class = MakeupHistorySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Only return the history for the currently authenticated user
        return MakeupHistory.objects.filter(user=self.request.user).order_by('-created_at')

    def perform_create(self, serializer):
        # Automatically set the user to the currently authenticated user
        serializer.save(user=self.request.user)
