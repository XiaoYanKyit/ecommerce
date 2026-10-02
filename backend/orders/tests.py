from decimal import Decimal

from django.test import override_settings
from rest_framework.test import APITestCase

from products.models import Product
from users.models import User

from .models import Order

SHIPPING = {
    "shipping_full_name": "Jane Doe",
    "shipping_email": "jane@example.com",
    "shipping_phone": "555-0100",
    "shipping_address_line1": "1 Main St",
    "shipping_city": "Miami",
    "shipping_state": "FL",
    "shipping_postal_code": "33101",
    "shipping_country": "USA",
    "payment_method": "cod",
}


@override_settings(SHIPPING_FLAT_RATE=Decimal("5.00"), FREE_SHIPPING_THRESHOLD=Decimal("50.00"))
class CheckoutTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(email="jane@example.com", password="pw-12345-xyz")
        self.admin = User.objects.create_user(email="admin@example.com", password="pw-12345-xyz", is_staff=True)
        self.product = Product.objects.create(name="Widget", price=Decimal("20.00"), stock=5)
        self.client.force_authenticate(self.user)

    def add(self, quantity, product=None):
        return self.client.post(
            "/api/cart/items/", {"product_id": (product or self.product).id, "quantity": quantity}, format="json"
        )

    def checkout(self):
        return self.client.post("/api/orders/", SHIPPING, format="json")

    def test_cart_requires_login(self):
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get("/api/cart/").status_code, 401)

    def test_cart_add_update_remove(self):
        r = self.add(2)
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data["item_count"], 2)
        self.assertEqual(r.data["subtotal"], "40.00")
        self.assertEqual(r.data["shipping_cost"], "5.00")
        self.assertEqual(r.data["total"], "45.00")

        # Adding the same product again increases the quantity instead of duplicating the line.
        self.assertEqual(self.add(1).data["items"][0]["quantity"], 3)

        item_id = r.data["items"][0]["id"]
        patched = self.client.patch(f"/api/cart/items/{item_id}/", {"quantity": 1}, format="json")
        self.assertEqual(patched.data["subtotal"], "20.00")

        removed = self.client.delete(f"/api/cart/items/{item_id}/")
        self.assertEqual(removed.data["items"], [])

    def test_cannot_exceed_stock(self):
        self.assertEqual(self.add(6).status_code, 400)
        self.assertEqual(self.client.get("/api/cart/").data["items"], [])

    def test_free_shipping_over_threshold(self):
        r = self.add(3)  # 60.00
        self.assertEqual(r.data["shipping_cost"], "0.00")
        self.assertEqual(r.data["total"], "60.00")

    def test_full_checkout_flow(self):
        self.add(2)
        r = self.checkout()
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data["subtotal"], "40.00")
        self.assertEqual(r.data["total"], "45.00")
        self.assertEqual(r.data["status"], "pending")
        self.assertEqual(r.data["payment_status"], "unpaid")
        self.assertEqual(r.data["items"][0]["quantity"], 2)

        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 3)
        self.assertEqual(self.client.get("/api/cart/").data["items"], [])

        listing = self.client.get("/api/orders/")
        self.assertEqual(listing.data["count"], 1)
        detail = self.client.get(f"/api/orders/{r.data['order_number']}/")
        self.assertEqual(detail.status_code, 200)

    def test_price_is_a_snapshot(self):
        self.add(1)
        number = self.checkout().data["order_number"]
        self.product.price = Decimal("99.00")
        self.product.save()
        detail = self.client.get(f"/api/orders/{number}/")
        self.assertEqual(detail.data["items"][0]["price"], "20.00")

    def test_empty_cart_cannot_check_out(self):
        self.assertEqual(self.checkout().status_code, 400)

    def test_checkout_fails_if_stock_vanished(self):
        self.add(4)
        Product.objects.filter(pk=self.product.pk).update(stock=1)
        r = self.checkout()
        self.assertEqual(r.status_code, 400)
        self.assertEqual(Order.objects.count(), 0)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 1)

    def test_customer_cancel_restocks(self):
        self.add(2)
        number = self.checkout().data["order_number"]
        r = self.client.post(f"/api/orders/{number}/cancel/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["status"], "cancelled")
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 5)
        # Cancelling twice is rejected.
        self.assertEqual(self.client.post(f"/api/orders/{number}/cancel/").status_code, 400)

    def test_users_cannot_see_each_others_orders(self):
        self.add(1)
        number = self.checkout().data["order_number"]
        other = User.objects.create_user(email="other@example.com", password="pw-12345-xyz")
        self.client.force_authenticate(other)
        self.assertEqual(self.client.get(f"/api/orders/{number}/").status_code, 404)
        self.assertEqual(self.client.get("/api/orders/").data["count"], 0)

    def test_admin_updates_status_and_cancel_restocks(self):
        self.add(2)
        number = self.checkout().data["order_number"]

        self.client.force_authenticate(self.user)
        self.assertEqual(self.client.patch(f"/api/admin/orders/{number}/", {"status": "shipped"}, format="json").status_code, 403)

        self.client.force_authenticate(self.admin)
        r = self.client.patch(
            f"/api/admin/orders/{number}/", {"status": "processing", "payment_status": "paid"}, format="json"
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["payment_status"], "paid")

        r = self.client.patch(f"/api/admin/orders/{number}/", {"status": "cancelled"}, format="json")
        self.assertEqual(r.status_code, 200)
        self.product.refresh_from_db()
        self.assertEqual(self.product.stock, 5)

        reopen = self.client.patch(f"/api/admin/orders/{number}/", {"status": "pending"}, format="json")
        self.assertEqual(reopen.status_code, 400)

    def test_admin_stats(self):
        self.add(2)
        number = self.checkout().data["order_number"]
        self.client.force_authenticate(self.admin)
        self.client.patch(f"/api/admin/orders/{number}/", {"payment_status": "paid"}, format="json")
        r = self.client.get("/api/admin/stats/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["total_orders"], 1)
        self.assertEqual(r.data["pending_orders"], 1)
        self.assertEqual(r.data["revenue"], "45.00")
        self.assertEqual(r.data["total_customers"], 1)
        self.assertEqual(len(r.data["sales_last_7_days"]), 7)
        self.assertEqual(r.data["sales_last_7_days"][-1]["orders"], 1)
        self.assertEqual(r.data["low_stock_products"][0]["slug"], "widget")
