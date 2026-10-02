from django.contrib import admin

from .models import Category, Product


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug")
    search_fields = ("name",)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ("name", "sku", "category", "price", "discount_price", "stock", "is_active")
    list_filter = ("is_active", "category")
    search_fields = ("name", "sku")
    readonly_fields = ("created_at", "updated_at")
