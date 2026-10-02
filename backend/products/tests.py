from decimal import Decimal

from rest_framework.test import APITestCase

from users.models import User

from .models import Category, Product


class ProductAPITests(APITestCase):
    def setUp(self):
        self.books = Category.objects.create(name="Books")
        self.novel = Product.objects.create(name="Novel", price=Decimal("10.00"), category=self.books, stock=5)
        self.lamp = Product.objects.create(
            name="Lamp", price=Decimal("40.00"), discount_price=Decimal("30.00"), stock=0
        )
        self.hidden = Product.objects.create(name="Hidden", price=Decimal("5.00"), stock=1, is_active=False)
        self.admin = User.objects.create_user(email="admin@x.com", password="pw-12345-xyz", is_staff=True)
        self.user = User.objects.create_user(email="user@x.com", password="pw-12345-xyz")

    def names(self, response):
        return [p["name"] for p in response.data["results"]]

    def test_list_is_public_and_hides_inactive(self):
        r = self.client.get("/api/products/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["count"], 2)
        self.assertNotIn("Hidden", self.names(r))

    def test_detail_by_slug_and_computed_fields(self):
        r = self.client.get("/api/products/lamp/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["current_price"], "30.00")
        self.assertTrue(r.data["on_sale"])
        self.assertEqual(r.data["discount_percent"], 25)
        self.assertFalse(r.data["in_stock"])
        self.assertEqual(self.client.get("/api/products/hidden/").status_code, 404)

    def test_filters(self):
        self.assertEqual(self.names(self.client.get("/api/products/?category=books")), ["Novel"])
        self.assertEqual(self.names(self.client.get("/api/products/?search=lamp")), ["Lamp"])
        self.assertEqual(self.names(self.client.get("/api/products/?in_stock=true")), ["Novel"])
        self.assertEqual(self.names(self.client.get("/api/products/?on_sale=true")), ["Lamp"])
        # Price filters use the price customers pay (Lamp is 30, not 40).
        self.assertEqual(self.names(self.client.get("/api/products/?min_price=20&max_price=35")), ["Lamp"])

    def test_ordering_by_price_uses_discounted_price(self):
        self.assertEqual(self.names(self.client.get("/api/products/?ordering=price")), ["Novel", "Lamp"])
        self.assertEqual(self.names(self.client.get("/api/products/?ordering=-price")), ["Lamp", "Novel"])

    def test_only_staff_can_write(self):
        body = {"name": "New thing", "price": "9.99", "stock": 3, "category_id": self.books.id}
        self.assertEqual(self.client.post("/api/products/", body, format="json").status_code, 401)
        self.client.force_authenticate(self.user)
        self.assertEqual(self.client.post("/api/products/", body, format="json").status_code, 403)
        self.client.force_authenticate(self.admin)
        r = self.client.post("/api/products/", body, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data["slug"], "new-thing")
        self.assertTrue(r.data["sku"].startswith("SKU-"))
        self.assertEqual(r.data["category"]["slug"], "books")

    def test_discount_must_be_lower_than_price(self):
        self.client.force_authenticate(self.admin)
        r = self.client.post("/api/products/", {"name": "Bad", "price": "10.00", "discount_price": "12.00"}, format="json")
        self.assertEqual(r.status_code, 400)
        self.assertIn("discount_price", r.data)

    def test_staff_can_edit_inactive_product_and_list_it(self):
        self.client.force_authenticate(self.admin)
        r = self.client.patch("/api/products/hidden/", {"stock": 10}, format="json")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["stock"], 10)
        listing = self.client.get("/api/products/?include_inactive=true")
        self.assertEqual(listing.data["count"], 3)

    def test_categories_list_with_counts(self):
        r = self.client.get("/api/categories/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data[0]["slug"], "books")
        self.assertEqual(r.data[0]["product_count"], 1)
