from django.urls import path
from .views import CategoryViewSet, ProductViewSet

urlpatterns = [
    path('visual-search/', ProductViewSet.as_view({'post': 'visual_search'}), name='product-visual-search'),
    path('build-outfit/', ProductViewSet.as_view({'post': 'build_outfit'}), name='product-build-outfit'),
    path('', ProductViewSet.as_view({'get': 'list', 'post': 'create'}), name='product-list'),
    path('<int:pk>/', ProductViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='product-detail'),
    path('<int:pk>/reviews/', ProductViewSet.as_view({'get': 'reviews', 'post': 'reviews'}), name='product-reviews'),
    path('<int:pk>/dislike/', ProductViewSet.as_view({'post': 'dislike'}), name='product-dislike'),
    path('<int:pk>/like/', ProductViewSet.as_view({'post': 'like'}), name='product-like'),
    path('categories/', CategoryViewSet.as_view({'get': 'list', 'post': 'create'}), name='category-list'),
    path('categories/<int:pk>/', CategoryViewSet.as_view({'get': 'retrieve', 'put': 'update', 'patch': 'partial_update', 'delete': 'destroy'}), name='category-detail'),
]
