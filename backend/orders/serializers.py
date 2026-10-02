from rest_framework import serializers

from products.models import Product
from products.serializers import ProductSerializer

from .models import Cart, CartItem, Order, OrderItem
from .services import calculate_shipping, cart_subtotal, money

MAX_PER_LINE = 99

SHIPPING_FIELDS = [
    "shipping_full_name",
    "shipping_email",
    "shipping_phone",
    "shipping_address_line1",
    "shipping_address_line2",
    "shipping_city",
    "shipping_state",
    "shipping_postal_code",
    "shipping_country",
]


# ---- Cart --------------------------------------------------------------------
class CartItemSerializer(serializers.ModelSerializer):
    product = ProductSerializer(read_only=True)
    line_total = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = ["id", "product", "quantity", "line_total"]

    def get_line_total(self, item):
        return str(money(item.product.current_price * item.quantity))


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    item_count = serializers.SerializerMethodField()
    subtotal = serializers.SerializerMethodField()
    shipping_cost = serializers.SerializerMethodField()
    total = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ["id", "items", "item_count", "subtotal", "shipping_cost", "total"]

    def get_item_count(self, cart):
        return sum(i.quantity for i in cart.items.all())

    def get_subtotal(self, cart):
        return str(cart_subtotal(cart))

    def get_shipping_cost(self, cart):
        return str(calculate_shipping(cart_subtotal(cart)))

    def get_total(self, cart):
        subtotal = cart_subtotal(cart)
        return str(subtotal + calculate_shipping(subtotal))


class AddToCartSerializer(serializers.Serializer):
    product_id = serializers.PrimaryKeyRelatedField(
        queryset=Product.objects.filter(is_active=True), source="product"
    )
    quantity = serializers.IntegerField(min_value=1, max_value=MAX_PER_LINE, default=1)


class UpdateCartItemSerializer(serializers.Serializer):
    quantity = serializers.IntegerField(min_value=1, max_value=MAX_PER_LINE)


# ---- Orders ------------------------------------------------------------------
class OrderItemSerializer(serializers.ModelSerializer):
    line_total = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    product_slug = serializers.SerializerMethodField()
    image = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = ["id", "product_slug", "product_name", "product_sku", "image", "quantity", "price", "line_total"]

    def get_product_slug(self, item):
        return item.product.slug if item.product else None

    def get_image(self, item):
        product = item.product
        if not product or not product.image:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(product.image.url) if request else product.image.url


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    payment_status_display = serializers.CharField(source="get_payment_status_display", read_only=True)
    payment_method_display = serializers.CharField(source="get_payment_method_display", read_only=True)
    customer_email = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            "id",
            "order_number",
            "status",
            "status_display",
            "payment_status",
            "payment_status_display",
            "payment_method",
            "payment_method_display",
            *SHIPPING_FIELDS,
            "notes",
            "subtotal",
            "shipping_cost",
            "total",
            "customer_email",
            "items",
            "created_at",
            "updated_at",
        ]
        read_only_fields = fields

    def get_customer_email(self, order):
        return order.user.email if order.user else order.shipping_email


class CheckoutSerializer(serializers.ModelSerializer):
    """Shipping details and payment choice supplied at checkout."""

    class Meta:
        model = Order
        fields = [*SHIPPING_FIELDS, "payment_method", "notes"]


class AdminOrderUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Order
        fields = ["status", "payment_status"]
