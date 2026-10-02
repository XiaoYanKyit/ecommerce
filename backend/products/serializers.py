from rest_framework import serializers

from .models import Category, Product

MAX_IMAGE_BYTES = 5 * 1024 * 1024


def check_image_size(image):
    if image and image.size > MAX_IMAGE_BYTES:
        raise serializers.ValidationError("Image must be 5 MB or smaller.")
    return image


class CategoryBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "slug"]


class CategorySerializer(serializers.ModelSerializer):
    # Filled by the view's annotation; omitted from write responses.
    product_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Category
        fields = ["id", "name", "slug", "description", "image", "product_count"]
        read_only_fields = ["slug"]

    def validate_image(self, image):
        return check_image_size(image)


class ProductSerializer(serializers.ModelSerializer):
    category = CategoryBriefSerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), source="category", write_only=True, required=False, allow_null=True
    )
    current_price = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    on_sale = serializers.BooleanField(read_only=True)
    discount_percent = serializers.IntegerField(read_only=True)
    in_stock = serializers.BooleanField(read_only=True)

    class Meta:
        model = Product
        fields = [
            "id",
            "name",
            "slug",
            "description",
            "price",
            "discount_price",
            "current_price",
            "on_sale",
            "discount_percent",
            "category",
            "category_id",
            "image",
            "stock",
            "in_stock",
            "sku",
            "is_active",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["slug", "created_at", "updated_at"]
        extra_kwargs = {"sku": {"required": False}}

    def validate_image(self, image):
        return check_image_size(image)

    def validate(self, attrs):
        price = attrs.get("price", getattr(self.instance, "price", None))
        discount = (
            attrs["discount_price"]
            if "discount_price" in attrs
            else getattr(self.instance, "discount_price", None)
        )
        if discount is not None and price is not None and discount >= price:
            raise serializers.ValidationError(
                {"discount_price": "Discount price must be lower than the regular price."}
            )
        return attrs

