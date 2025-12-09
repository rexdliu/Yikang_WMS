import unittest
from src.Backend.app.core.config import settings


class ConfigTests(unittest.TestCase):
    def test_sqlalchemy_url_defaults_to_database_url(self):
        self.assertEqual(settings.SQLALCHEMY_DATABASE_URL, settings.DATABASE_URL)


if __name__ == "__main__":
    unittest.main()
