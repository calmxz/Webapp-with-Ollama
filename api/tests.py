from django.test import TestCase, Client
import json

class APITest(TestCase):
    def setUp(self):
        self.client = Client()

    def test_ask_ollama(self):
        response = self.client.post(
            "/api/ask/",
            json.dumps({"prompt": "What is Python?"}),
            content_type="application/json"
        )
        print("Response:", response.status_code, response.json())  # Debugging
        self.assertEqual(response.status_code, 200)
        self.assertIn("response", response.json())  # Ensure API returns a response