from django.contrib import admin
from .models import Post, Comment

class CommentInline(admin.TabularInline):
    model = Comment
    extra = 1
    fields = ('user', 'content', 'parent', 'created_at')
    readonly_fields = ('created_at',)

@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'content_excerpt', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('user__email', 'content')
    prepopulated_fields = {'slug': ('content',)}
    inlines = [CommentInline]
    readonly_fields = ('created_at', 'updated_at')

    def content_excerpt(self, obj):
        return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
    content_excerpt.short_description = 'Content'

@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'post', 'parent', 'created_at')
    list_filter = ('created_at',)
    search_fields = ('user__email', 'content', 'post__content')
    readonly_fields = ('created_at',)
