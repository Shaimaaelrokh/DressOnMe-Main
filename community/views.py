from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Post, Comment
from .serializers import PostSerializer, CommentSerializer
from django.shortcuts import get_object_or_404

class PostViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing and creating community posts.
    
    Headers: Authorization: Bearer <token> (Required for POST, like, add_comment)
    Methods: GET (List/Retrieve), POST (Create), POST (like), GET (comments), POST (add_comment)
    POST Body (Create):
        content (str), image (file)
    """
    queryset = Post.objects.all().order_by('-created_at')

    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filterset_fields = ['user']

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def like(self, request, pk=None):
        post = self.get_object()
        user = request.user

        if post.likes.filter(id=user.id).exists():
            post.likes.remove(user)
            return Response({'status': 'unliked', 'count': post.like_count})
        
        post.likes.add(user)
        # If liked, remove any existing dislike
        post.dislikes.remove(user)
        return Response({'status': 'liked', 'count': post.like_count})

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def dislike(self, request, pk=None):
        post = self.get_object()
        user = request.user

        if post.dislikes.filter(id=user.id).exists():
            post.dislikes.remove(user)
            return Response({'status': 'undisliked', 'count': post.dislike_count})
        
        post.dislikes.add(user)
        # If disliked, remove any existing like
        post.likes.remove(user)
        return Response({'status': 'disliked', 'count': post.dislike_count})


    @action(detail=True, methods=['get'])
    def comments(self, request, pk=None):
        post = self.get_object()
        comments = post.comments.all().order_by('-created_at')
        page = self.paginate_queryset(comments)
        if page is not None:
            serializer = CommentSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        
        serializer = CommentSerializer(comments, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def add_comment(self, request, pk=None):
        post = self.get_object()
        serializer = CommentSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save(user=request.user, post=post)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class CommentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for viewing and managing comments.
    
    Headers: Authorization: Bearer <token> (Required for POST, PUT, PATCH, DELETE)
    Methods: GET (List/Retrieve), POST (Create), PUT/PATCH (Update), DELETE (Destroy)
    POST Body:
        content (str), parent (int, optional), post (int, if not using post action)
    """
    queryset = Comment.objects.all()

    serializer_class = CommentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        # This might be used if posting to /comments/ directly, but usually we use post/ID/comments
        # But for generic update/delete, this is useful
        serializer.save(user=self.request.user)

    def get_queryset(self):
        # Optional: restrict to own comments for list? Or global?
        return super().get_queryset()
