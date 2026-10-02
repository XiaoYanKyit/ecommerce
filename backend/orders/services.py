from decimal import ROUND_HALF_UP, Decimal

from django.conf import settings
from django.db import transaction
from django.db.models import F
from rest_framework.exceptions import ValidationError

from products.models import Product

from .models import Cart, Order, OrderItem

TWO_PLACES = Decimal("0.01")


def money(value):
    return Decimal(value).quantize(TWO_PLACES, rounding=ROUND_HALF_UP)


def calculate_shipping(subtotal):
    """Flat rate, free once the subtotal reaches the threshold."""
    if subtotal <= 0 or subtotal >= settings.FREE_SHIPPING_THRESHOLD:
        return money(0)
    return money(settings.SHIPPING_FLAT_RATE)


def cart_subtotal(cart):
    return money(sum((i.product.current_price * i.quantity for i in cart.items.all()), Decimal("0")))


def restock_order(order):
    """Return an order's items to stock (used when an order is cancelled)."""
    for item in order.items.exclude(product=None):
        Product.objects.filter(pk=item.product_id).update(stock=F("stock") + item.quantity)


@transaction.atomic
def create_order_from_cart(user, data):
    """
    Turn the user's cart into an order. All-or-nothing: stock is checked and
    decremented inside one transaction, and the cart is emptied on success.
    `data` holds the validated shipping fields, payment_method and notes.
    """
    cart = Cart.objects.filter(user=user).first()
    items = list(cart.items.all()) if cart else []
    if not items:
        raise ValidationError({"cart": ["Your cart is empty."]})

    products = {
        p.pk: p for p in Product.objects.select_for_update().filter(pk__in=[i.product_id for i in items])
    }

    problems = []
    for item in items:
        product = products[item.product_id]
        if not product.is_active:
            problems.append(f"{product.name} is no longer available.")
        elif item.quantity > product.stock:
            problems.append(f"Only {product.stock} of {product.name} left in stock.")
    if problems:
        raise ValidationError({"cart": problems})

    subtotal = money(sum((products[i.product_id].current_price * i.quantity for i in items), Decimal("0")))
    shipping_cost = calculate_shipping(subtotal)
    order = Order.objects.create(
        user=user,
        subtotal=subtotal,
        shipping_cost=shipping_cost,
        total=subtotal + shipping_cost,
        **data,
    )
    OrderItem.objects.bulk_create(
        [
            OrderItem(
                order=order,
                product=products[i.product_id],
                product_name=products[i.product_id].name,
                product_sku=products[i.product_id].sku,
                quantity=i.quantity,
                price=products[i.product_id].current_price,
            )
            for i in items
        ]
    )
    for item in items:
        Product.objects.filter(pk=item.product_id).update(stock=F("stock") - item.quantity)
    cart.items.all().delete()
    return order
