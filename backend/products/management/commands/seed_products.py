import io
from decimal import Decimal

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand, CommandError

from products.models import Category, Product
from users.models import User

CATEGORIES = {
    "Electronics": "Gadgets and accessories for everyday life.",
    "Clothing": "Comfortable basics and outerwear.",
    "Home & Kitchen": "Useful things for the places you live and cook.",
    "Books": "Fiction, non-fiction and practical guides.",
    "Sports & Outdoors": "Gear for training and time outside.",
}

# (name, category, price, discount_price, stock, description, colour)
PRODUCTS = [
    ("Wireless Noise-Cancelling Headphones", "Electronics", "129.99", "99.99", 25, "Over-ear headphones with 30-hour battery life and active noise cancellation.", "#3b5bdb"),
    ("Portable Bluetooth Speaker", "Electronics", "59.00", None, 40, "Waterproof speaker with deep bass and a 12-hour battery.", "#1c7ed6"),
    ("Mechanical Keyboard", "Electronics", "89.50", "74.50", 3, "Compact 75% layout with hot-swappable switches.", "#495057"),
    ("Organic Cotton T-Shirt", "Clothing", "24.00", None, 120, "Soft, midweight tee in a relaxed fit.", "#2f9e44"),
    ("Waterproof Shell Jacket", "Clothing", "139.00", "109.00", 18, "Lightweight three-layer jacket with taped seams.", "#e8590c"),
    ("Merino Wool Beanie", "Clothing", "29.00", None, 0, "Warm, breathable beanie that does not itch.", "#862e9c"),
    ("Cast Iron Skillet 12\"", "Home & Kitchen", "44.99", None, 30, "Pre-seasoned skillet that goes from stove to oven to table.", "#343a40"),
    ("Pour-Over Coffee Set", "Home & Kitchen", "52.00", "42.00", 22, "Glass carafe, steel filter and a gooseneck kettle.", "#a5671c"),
    ("Linen Bed Sheet Set", "Home & Kitchen", "119.00", None, 14, "Stonewashed linen that gets softer with every wash.", "#0b7285"),
    ("The Pragmatic Programmer", "Books", "39.99", None, 50, "Classic advice for working developers.", "#c92a2a"),
    ("Atomic Habits", "Books", "18.00", "14.50", 75, "A practical guide to building good habits.", "#f08c00"),
    ("Cooking for Beginners", "Books", "26.00", None, 4, "Fifty simple recipes and the techniques behind them.", "#5c940d"),
    ("Yoga Mat 6mm", "Sports & Outdoors", "35.00", None, 60, "Non-slip mat with alignment lines.", "#7048e8"),
    ("Insulated Water Bottle 1L", "Sports & Outdoors", "32.00", "27.00", 85, "Keeps drinks cold for 24 hours or hot for 12.", "#1098ad"),
    ("Trail Running Backpack 12L", "Sports & Outdoors", "74.00", None, 9, "Light hydration pack with two soft flasks.", "#d9480f"),
]


def make_placeholder(label, colour):
    """Generate a simple square placeholder image so the UI has something to show."""
    from PIL import Image, ImageDraw, ImageFont

    size = 800
    img = Image.new("RGB", (size, size), colour)
    draw = ImageDraw.Draw(img)
    draw.ellipse((size * 0.18, size * 0.18, size * 0.82, size * 0.82), fill=(255, 255, 255))
    try:
        font = ImageFont.load_default(size=220)
    except TypeError:  # very old Pillow
        font = ImageFont.load_default()
    initials = "".join(w[0] for w in label.split()[:2]).upper()
    draw.text((size / 2, size / 2), initials, fill=colour, font=font, anchor="mm")
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return ContentFile(buf.getvalue())


class Command(BaseCommand):
    help = "Create demo categories, products, an admin user and a customer (development only)."

    def add_arguments(self, parser):
        parser.add_argument("--no-images", action="store_true", help="Skip generating placeholder images.")

    def handle(self, *args, **options):
        if not settings.DEBUG:
            raise CommandError("Refusing to seed demo data while DEBUG is off.")

        categories = {}
        for name, description in CATEGORIES.items():
            categories[name], _ = Category.objects.get_or_create(name=name, defaults={"description": description})

        created = 0
        for i, (name, cat, price, discount, stock, description, colour) in enumerate(PRODUCTS, start=1):
            product, was_created = Product.objects.get_or_create(
                sku=f"DEMO-{i:03d}",
                defaults={
                    "name": name,
                    "category": categories[cat],
                    "price": Decimal(price),
                    "discount_price": Decimal(discount) if discount else None,
                    "stock": stock,
                    "description": description,
                },
            )
            if was_created:
                created += 1
            if not options["no_images"] and not product.image:
                product.image.save(f"demo-{i:03d}.jpg", make_placeholder(name, colour), save=True)

        admin, admin_new = User.objects.get_or_create(
            email="admin@example.com",
            defaults={"first_name": "Admin", "last_name": "User", "is_staff": True, "is_superuser": True},
        )
        if admin_new:
            admin.set_password("admin12345")
            admin.save()
        customer, customer_new = User.objects.get_or_create(
            email="customer@example.com", defaults={"first_name": "Demo", "last_name": "Customer"}
        )
        if customer_new:
            customer.set_password("customer12345")
            customer.save()

        self.stdout.write(self.style.SUCCESS(
            f"Seeded {len(CATEGORIES)} categories, {created} new products (of {len(PRODUCTS)})."
        ))
        self.stdout.write("Admin:    admin@example.com / admin12345")
        self.stdout.write("Customer: customer@example.com / customer12345")
