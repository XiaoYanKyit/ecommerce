import uuid
from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models

from .utils import unique_slugify


class Category(models.Model):
    name = models.CharField(max_length=120, unique=True)
    slug = models.SlugField(max_length=140, unique=True, blank=True)
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to="categories/", null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "categories"
        ordering = ["name"]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slugify(Category, self.name, instance=self, max_length=140)
        super().save(*args, **kwargs)


class Product(models.Model):
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=280, unique=True, blank=True)
    description = models.TextField(blank=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))])
    discount_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal("0.01"))],
        help_text="Sale price. Must be lower than the regular price.",
    )
    category = models.ForeignKey(
        Category, null=True, blank=True, on_delete=models.SET_NULL, related_name="products"
    )
    image = models.ImageField(upload_to="products/", null=True, blank=True)
    stock = models.PositiveIntegerField(default=0)
    sku = models.CharField(max_length=64, unique=True, blank=True)
    is_active = models.BooleanField(default=True, help_text="Inactive products are hidden from the storefront.")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["is_active", "-created_at"])]

    def __str__(self):
        return self.name

    def clean(self):
        if self.discount_price is not None and self.price is not None and self.discount_price >= self.price:
            raise ValidationError({"discount_price": "Discount price must be lower than the regular price."})

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slugify(Product, self.name, instance=self, max_length=280)
        if not self.sku:
            self.sku = f"SKU-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)

    @property
    def on_sale(self):
        return self.discount_price is not None and self.discount_price < self.price

    @property
    def current_price(self):
        """The price a customer actually pays."""
        return self.discount_price if self.on_sale else self.price

    @property
    def discount_percent(self):
        if not self.on_sale:
            return 0
        return int(round((self.price - self.discount_price) / self.price * 100))

    @property
    def in_stock(self):
        return self.stock > 0
