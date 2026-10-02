from django.urls import path
from rest_framework.routers import SimpleRouter

from .views import (
    AdminOrderViewSet,
    AdminStatsView,
    CartItemCreateView,
    CartItemDetailView,
    CartView,
    OrderViewSet,
)

router = SimpleRouter()
router.register("orders", OrderViewSet, basename="order")
router.register("admin/orders", AdminOrderViewSet, basename="admin-order")

urlpatterns = [
    path("cart/", CartView.as_view(), name="cart"),
    path("cart/items/", CartItemCreateView.as_view(), name="cart-item-create"),
    path("cart/items/<int:item_id>/", CartItemDetailView.as_view(), name="cart-item-detail"),
    path("admin/stats/", AdminStatsView.as_view(), name="admin-stats"),
    *router.urls,
]
