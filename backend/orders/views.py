from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.db.models import Count, DecimalField, Sum, Value
from django.db.models.functions import Coalesce, TruncDate
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.permissions import IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from products.models import Product
from users.models import User

from .models import Cart, CartItem, Order
from .serializers import (
    AddToCartSerializer,
    AdminOrderUpdateSerializer,
    CartSerializer,
    CheckoutSerializer,
    OrderSerializer,
    UpdateCartItemSerializer,
)
from .services import create_order_from_cart, restock_order

ORDER_PREFETCH = ("items__product",)
MONEY = DecimalField(max_digits=12, decimal_places=2)
ZERO = Value(Decimal("0.00"), output_field=MONEY)


# ---- Cart --------------------------------------------------------------------
def cart_response(request, http_status=status.HTTP_200_OK):
    """Every cart endpoint returns the full, fresh cart so the UI can just replace its state."""
    cart, _ = Cart.objects.get_or_create(user=request.user)
    cart = Cart.objects.prefetch_related("items__product__category").get(pk=cart.pk)
    return Response(CartSerializer(cart, context={"request": request}).data, status=http_status)


class CartView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return cart_response(request)

    def delete(self, request):
        CartItem.objects.filter(cart__user=request.user).delete()
        return cart_response(request)


class CartItemCreateView(APIView):
    """Add a product to the cart (adds to the quantity if it is already there)."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = AddToCartSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        product = serializer.validated_data["product"]
        quantity = serializer.validated_data["quantity"]

        cart, _ = Cart.objects.get_or_create(user=request.user)
        with transaction.atomic():
            item, _ = CartItem.objects.get_or_create(cart=cart, product=product, defaults={"quantity": 0})
            new_quantity = item.quantity + quantity
            if new_quantity > product.stock:
                raise ValidationError(
                    {"quantity": [f"Only {product.stock} in stock."] if product.stock else ["Out of stock."]}
                )
            item.quantity = new_quantity
            item.save(update_fields=["quantity"])
        return cart_response(request, status.HTTP_201_CREATED)


class CartItemDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_item(self, request, item_id):
        return get_object_or_404(CartItem.objects.select_related("product"), pk=item_id, cart__user=request.user)

    def patch(self, request, item_id):
        item = self.get_item(request, item_id)
        serializer = UpdateCartItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        quantity = serializer.validated_data["quantity"]
        if quantity > item.product.stock:
            raise ValidationError({"quantity": [f"Only {item.product.stock} in stock."]})
        item.quantity = quantity
        item.save(update_fields=["quantity"])
        return cart_response(request)

    def delete(self, request, item_id):
        self.get_item(request, item_id).delete()
        return cart_response(request)


# ---- Orders (customer) ---------------------------------------------------------
class OrderViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """
    list / retrieve: the signed-in customer's own orders.
    create: checkout (builds an order from the server-side cart).
    cancel: customers can cancel while the order is still pending.
    """

    serializer_class = OrderSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = "order_number"

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).prefetch_related(*ORDER_PREFETCH)

    def create(self, request, *args, **kwargs):
        serializer = CheckoutSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order = create_order_from_cart(request.user, serializer.validated_data)
        order = self.get_queryset().get(pk=order.pk)
        return Response(OrderSerializer(order, context={"request": request}).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["post"])
    def cancel(self, request, order_number=None):
        with transaction.atomic():
            order = get_object_or_404(
                Order.objects.select_for_update().filter(user=request.user), order_number=order_number
            )
            if order.status != Order.Status.PENDING:
                raise ValidationError({"status": ["Only pending orders can be cancelled."]})
            restock_order(order)
            order.status = Order.Status.CANCELLED
            order.save(update_fields=["status", "updated_at"])
        order = self.get_queryset().get(pk=order.pk)
        return Response(OrderSerializer(order, context={"request": request}).data)


# ---- Orders (admin) ------------------------------------------------------------
class AdminOrderViewSet(mixins.ListModelMixin, mixins.RetrieveModelMixin, mixins.UpdateModelMixin, viewsets.GenericViewSet):
    """Staff: see every order and change its status / payment status."""

    serializer_class = OrderSerializer
    permission_classes = [IsAdminUser]
    lookup_field = "order_number"
    http_method_names = ["get", "patch", "head", "options"]
    filter_backends = [SearchFilter, OrderingFilter]
    search_fields = ["order_number", "shipping_email", "shipping_full_name", "user__email"]
    ordering_fields = ["created_at", "total", "status"]
    ordering = ["-created_at"]

    def get_queryset(self):
        qs = Order.objects.select_related("user").prefetch_related(*ORDER_PREFETCH)
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        payment = self.request.query_params.get("payment_status")
        if payment:
            qs = qs.filter(payment_status=payment)
        return qs

    def partial_update(self, request, *args, **kwargs):
        order_number = kwargs["order_number"]
        with transaction.atomic():
            order = get_object_or_404(Order.objects.select_for_update(), order_number=order_number)
            serializer = AdminOrderUpdateSerializer(order, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            new_status = serializer.validated_data.get("status", order.status)
            if order.status == Order.Status.CANCELLED and new_status != Order.Status.CANCELLED:
                raise ValidationError({"status": ["A cancelled order cannot be reopened."]})
            if order.status != Order.Status.CANCELLED and new_status == Order.Status.CANCELLED:
                restock_order(order)
            serializer.save()
        order = self.get_queryset().get(pk=order.pk)
        return Response(OrderSerializer(order, context={"request": request}).data)


class AdminStatsView(APIView):
    """Dashboard numbers for staff."""

    permission_classes = [IsAdminUser]

    def get(self, request):
        today = timezone.localdate()
        start = today - timedelta(days=6)
        live_orders = Order.objects.exclude(status=Order.Status.CANCELLED)

        gross = live_orders.aggregate(v=Coalesce(Sum("total"), ZERO, output_field=MONEY))["v"]
        paid = live_orders.filter(payment_status=Order.PaymentStatus.PAID).aggregate(
            v=Coalesce(Sum("total"), ZERO, output_field=MONEY)
        )["v"]

        by_day = {
            row["day"]: row
            for row in live_orders.filter(created_at__date__gte=start)
            .annotate(day=TruncDate("created_at"))
            .values("day")
            .annotate(orders=Count("id"), revenue=Coalesce(Sum("total"), ZERO, output_field=MONEY))
        }
        last_7_days = []
        for offset in range(7):
            day = start + timedelta(days=offset)
            row = by_day.get(day)
            last_7_days.append(
                {
                    "date": day.isoformat(),
                    "orders": row["orders"] if row else 0,
                    "revenue": f"{row['revenue']:.2f}" if row else "0.00",
                }
            )

        counts = dict(Order.objects.values_list("status").annotate(c=Count("id")))
        low_stock = Product.objects.filter(is_active=True, stock__lte=settings.LOW_STOCK_THRESHOLD).order_by("stock")[:10]
        recent = Order.objects.select_related("user")[:5]

        return Response(
            {
                "total_orders": Order.objects.count(),
                "pending_orders": counts.get(Order.Status.PENDING, 0),
                "gross_sales": f"{gross:.2f}",
                "revenue": f"{paid:.2f}",
                "total_products": Product.objects.count(),
                "total_customers": User.objects.filter(is_staff=False).count(),
                "orders_by_status": {value: counts.get(value, 0) for value, _ in Order.Status.choices},
                "sales_last_7_days": last_7_days,
                "low_stock_products": [
                    {"id": p.id, "name": p.name, "slug": p.slug, "sku": p.sku, "stock": p.stock} for p in low_stock
                ],
                "recent_orders": [
                    {
                        "order_number": o.order_number,
                        "customer": o.shipping_full_name,
                        "total": f"{o.total:.2f}",
                        "status": o.status,
                        "created_at": o.created_at,
                    }
                    for o in recent
                ],
            }
        )
