from rest_framework import serializers
from .models import Post, Comment
from users.serializers import UserSerializer

class CommentSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    user_email = serializers.ReadOnlyField(source='user.email')
    user_avatar = serializers.SerializerMethodField()
    user_id = serializers.ReadOnlyField(source='user.id')
    replies = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ('id', 'user', 'user_name', 'user_email', 'user_avatar', 'user_id', 'post', 'parent', 'content', 'image', 'created_at', 'replies')
        read_only_fields = ('user', 'post', 'created_at')

    def get_user_name(self, obj):
        name = obj.user.get_full_name()
        return name if name else obj.user.username

    def get_user_avatar(self, obj):
        request = self.context.get('request')
        if hasattr(obj.user, 'profile') and obj.user.profile.image:
            return request.build_absolute_uri(obj.user.profile.image.url) if request else obj.user.profile.image.url
        return None

    def get_replies(self, obj):
        if obj.replies.exists():
            return CommentSerializer(obj.replies.all(), many=True, context=self.context).data
        return []

class PostSerializer(serializers.ModelSerializer):
    user_name = serializers.SerializerMethodField()
    user_email = serializers.ReadOnlyField(source='user.email')
    user_avatar = serializers.SerializerMethodField()
    user_id = serializers.ReadOnlyField(source='user.id')
    
    comments = serializers.SerializerMethodField()
    like_count = serializers.IntegerField(read_only=True)
    comment_count = serializers.IntegerField(read_only=True)
    dislike_count = serializers.IntegerField(read_only=True)
    is_liked = serializers.SerializerMethodField()
    is_disliked = serializers.SerializerMethodField()
    
    class Meta:
        model = Post
        fields = ('id', 'user', 'user_name', 'user_email', 'user_avatar', 'user_id', 'content', 'image', 'created_at', 'updated_at', 'like_count', 'dislike_count', 'comment_count', 'is_liked', 'is_disliked', 'comments')
        read_only_fields = ('user', 'created_at', 'updated_at', 'like_count', 'dislike_count', 'comment_count', 'is_liked', 'is_disliked', 'comments')

    def get_user_name(self, obj):
        name = obj.user.get_full_name()
        return name if name else obj.user.username

    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.likes.filter(id=request.user.id).exists()
        return False

    def get_is_disliked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.dislikes.filter(id=request.user.id).exists()
        return False

    def get_user_avatar(self, obj):
        request = self.context.get('request')
        if hasattr(obj.user, 'profile') and obj.user.profile.image:
            return request.build_absolute_uri(obj.user.profile.image.url) if request else obj.user.profile.image.url
        return None

    def get_comments(self, obj):
        top_level_comments = obj.comments.filter(parent__isnull=True)
        return CommentSerializer(top_level_comments, many=True, context=self.context).data

