import asyncio
import os
import sys
import unittest
from datetime import datetime
from importlib import reload
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
BACKEND_PATH = PROJECT_ROOT / "src" / "Backend"
if str(BACKEND_PATH) not in sys.path:
    sys.path.append(str(BACKEND_PATH))

# 强制使用测试数据库
TEST_DB_URL = "sqlite:///./tests/test_api.db"
os.environ["DATABASE_URL"] = TEST_DB_URL

import app.core.config as config_module
reload(config_module)  # type: ignore
from app.core.config import settings  # type: ignore

import app.core.database as database_module
reload(database_module)  # type: ignore
from app.core.database import Base, engine, SessionLocal  # type: ignore

from app.core.security import get_password_hash
from app.models.product import Product, ProductCategory
from app.models.inventory import Warehouse, Inventory
from app.models.sales import Distributor, SalesOrder
from app.models.user import User

Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)

from httpx import ASGITransport, AsyncClient
from app.main import app


class APITestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.transport = ASGITransport(app=app)
        cls.base_url = "http://testserver"
        cls._seed_database()

    @classmethod
    def tearDownClass(cls) -> None:
        database_module.engine.dispose()

    @classmethod
    def _seed_database(cls) -> None:
        session = SessionLocal()
        try:
            category = ProductCategory(name="电子产品", description="高频出库类目")
            session.add(category)
            session.flush()

            product = Product(
                name="iPhone 14 Pro",
                sku="APPL-IP14P-256",
                price=9999.0,
                cost=6999.0,
                description="旗舰手机",
                category_id=category.id,
            )
            session.add(product)
            session.flush()

            warehouse = Warehouse(name="A 仓", location="上海", capacity=1000)
            session.add(warehouse)
            session.flush()

            inventory = Inventory(product_id=product.id, warehouse_id=warehouse.id, quantity=25, reserved_quantity=5)
            session.add(inventory)

            distributor = Distributor(
                name="环球科技供应商",
                contact_person="李女士",
                phone="13800010001",
                region="华北美区",
            )
            session.add(distributor)
            session.flush()

            sales_order = SalesOrder(
                order_code="SO-1001",
                distributor_id=distributor.id,
                product_id=product.id,
                product_name=product.name,
                quantity=10,
                total_value=99990.0,
                order_date=datetime(2024, 7, 15),
            )
            session.add(sales_order)

            user = User(
                username="manager",
                email="manager@example.com",
                phone="13800019999",
                hashed_password=get_password_hash("secret"),
                is_active=True,
            )
            session.add(user)

            session.commit()
        finally:
            session.close()

    def test_login_returns_token(self):
        response = self._request(
            "post",
            "/api/v1/auth/login",
            data={"username": "manager", "password": "secret"},
            headers={"content-type": "application/x-www-form-urlencoded"},
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("access_token", response.json())

    def test_products_endpoint(self):
        response = self._request("get", "/api/v1/products")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(any(item["sku"] == "APPL-IP14P-256" for item in data))

    def test_product_categories_endpoint(self):
        response = self._request("get", "/api/v1/products/categories")
        self.assertEqual(response.status_code, 200)
        categories = response.json()
        self.assertTrue(any(cat["name"] == "电子产品" for cat in categories))

    def test_inventory_endpoint(self):
        response = self._request("get", "/api/v1/inventory/items")
        self.assertEqual(response.status_code, 200)
        items = response.json()
        self.assertTrue(any(item["quantity"] == 25 for item in items))

    def test_sales_distributors_endpoint(self):
        response = self._request("get", "/api/v1/sales/distributors")
        self.assertEqual(response.status_code, 200)
        distributors = response.json()
        self.assertTrue(any(item["name"] == "环球科技供应商" for item in distributors))

    def test_rag_endpoint(self):
        payload = {"question": "库存安全库存应该怎么设置?"}
        response = self._request("post", "/api/v1/ai/rag/query", json=payload)
        self.assertEqual(response.status_code, 200)
        body = response.json()
        self.assertIn("answer", body)
        self.assertGreater(len(body.get("sources", [])), 0)

    def _request(self, method: str, url: str, **kwargs):
        async def _do_request():
            async with AsyncClient(transport=self.transport, base_url=self.base_url) as client:
                return await client.request(method, url, follow_redirects=True, **kwargs)

        response = asyncio.run(_do_request())
        return response


if __name__ == "__main__":
    unittest.main()
