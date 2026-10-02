from decimal import Decimal, InvalidOperation

from django.db.models import Case, Count, DecimalField, F, Q, When
from rest_framework import viewsets
from rest_framework.filters import OrderingFilter, SearchFilter
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser

from .models import Category, Product
from .permissions import IsAdminOrReadOnly
from .serializers import CategorySerializer, ProductSerializer

WRITE_ACTIONS = {"create", "update", "partial_update", "destroy"}


class ProductOrderingFilter(OrderingFilter):
    """`?ordering=price` sorts by the price customers pay (discount-aware)."""

    def get_ordering(self, request, queryset, view):
        ordering = super().get_ordering(request, queryset, view)
        return [o.replace("price", "sort_price") if o.lstrip("-") == "price" else o for o in ordering]


def _decimal_param(request, name):
    raw = request.query_params.get(name)
    if raw in (None, ""):
        return None
    try:
        return Decimal(raw)
    except InvalidOperation:
        return None


def _flag(request, name):
    return request.query_params.get(name, "").lower() in {"1", "true", "yes"}


class CategoryViewSet(viewsets.ModelViewSet):
    """Public read, staff write. Looked up by slug. Not paginated (short list)."""

    serializer_class = CategorySerializer
    permission_classes = [IsAdminOrReadOnly]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    lookup_field = "slug"
    pagination_class = None
    filter_backends = [SearchFilter]
    search_fields = ["name"]

    def get_queryset(self):
        return Category.objects.annotate(product_count=Count("products", filter=Q(products__is_active=True)))


class ProductViewSet(viewsets.ModelViewSet):
    """
    Public read, staff write. Looked up by slug.

    Query params for the list: search, category (slug), min_price, max_price,
    in_stock=true, on_sale=true, ordering (price, -price, name, created_at, -created_at),
    page, page_size. Staff can add include_inactive=true to see hidden products.
    """

    serializer_class = ProductSerializer
    permission_classes = [IsAdminOrReadOnly]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    lookup_field = "slug"
    filter_backends = [SearchFilter, ProductOrderingFilter]
    search_fields = ["name", "description", "sku", "category__name"]
    ordering_fields = ["name", "price", "created_at", "stock"]
    ordering = ["-created_at"]

    def get_queryset(self):
        request = self.request
        sort_price = Case(
            When(discount_price__isnull=False, discount_price__lt=F("price"), then=F("discount_price")),
            default=F("price"),
            output_field=DecimalField(max_digits=10, decimal_places=2),
        )
        qs = Product.objects.select_related("category").annotate(sort_price=sort_price)

        is_staff = bool(request.user and request.user.is_authenticated and request.user.is_staff)
        if not (is_staff and (self.action in WRITE_ACTIONS or _flag(request, "include_inactive"))):
            qs = qs.filter(is_active=True)

        if self.action != "list":
            return qs

        category = request.query_params.get("category")
        if category:
            qs = qs.filter(category__slug=category)
        min_price = _decimal_param(request, "min_price")
        if min_price is not None:
            qs = qs.filter(sort_price__gte=min_price)
        max_price = _decimal_param(request, "max_price")
        if max_price is not None:
            qs = qs.filter(sort_price__lte=max_price)
        if _flag(request, "in_stock"):
            qs = qs.filter(stock__gt=0)
        if _flag(request, "on_sale"):
            qs = qs.filter(discount_price__isnull=False, discount_price__lt=F("price"))
        return qs
