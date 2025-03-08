from django.test import TestCase, Client
import json

class APITest(TestCase):
    def setUp(self):
        self.client = Client()

    def test_ask_ollama(self):
        response = self.client.post(
            "/api/ask/",
            data=json.dumps({"prompt": "What is Python?"}),
            content_type="application/json"
        )

        print("Response Status:", response.status_code)
        print("Response Type:", response.__class__.__name__)  # Debugging step

        # Read streaming response content
        if hasattr(response, "streaming_content"):
            response_content = b"".join(response.streaming_content).decode("utf-8")
        else:
            response_content = response.content.decode("utf-8")

        print("Response Content (Raw):", response_content)  # Debugging step

        # Check if response is JSON before trying to parse it
        try:
            response_json = json.loads(response_content)  # Convert string to JSON
            self.assertIn("response", response_json)  # Ensure API returns expected key
        except json.JSONDecodeError:
            print("Response is plain text. Skipping JSON check.")
            self.assertTrue(len(response_content) > 0)  # Just check it's not empty

        self.assertEqual(response.status_code, 200)
