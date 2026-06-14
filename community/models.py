from django.db import models
from django.conf import settings
from django.utils.text import slugify
from django.utils.crypto import get_random_string

class Post(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='posts')
    content = models.TextField(blank=True)
    image = models.ImageField(upload_to='community_posts/', blank=True, null=True)
    slug = models.SlugField(unique=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    likes = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='liked_community_posts', blank=True)
    dislikes = models.ManyToManyField(settings.AUTH_USER_MODEL, related_name='disliked_community_posts', blank=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            # Create a base slug from content or default
            slug_base = slugify(self.content[:30]) if self.content else 'post'
            # Always append a random string to ensure uniqueness
            slug_suffix = get_random_string(8)
            self.slug = f"{slug_base}-{slug_suffix}"
            
        super().save(*args, **kwargs)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} - {self.created_at}"
    
    @property
    def dislike_count(self):
        return self.dislikes.count()

    @property
    def like_count(self):
        return self.likes.count()
    
    @property
    def comment_count(self):
        return self.comments.count()


class Comment(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='post_comments')
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='comments')
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.CASCADE, related_name='replies')
    content = models.TextField()
    image = models.ImageField(upload_to='community_comments/', blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Comment by {self.user} on {self.post}"

