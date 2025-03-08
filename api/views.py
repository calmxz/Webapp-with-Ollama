import requests
import json
from django.http import StreamingHttpResponse, JsonResponse
from django.views.decorators.csrf import csrf_exempt

@csrf_exempt
def ask_ollama(request):
    if request.method == "POST":
        try:
            data = json.loads(request.body)
            prompt = data.get("prompt", "")
            if not prompt:
                return JsonResponse({"error": "Missing 'prompt' field"}, status=400)

            def stream_response():
                with requests.post(
                    "http://localhost:11434/api/generate",
                    json={"model": "llama3.2", "prompt": prompt},
                    stream=True
                ) as ollama_response:
                    for line in ollama_response.iter_lines():
                        if line:
                            try:
                               chunk = json.loads(line)
                               text = chunk.get("response", "")
                               if text:
                                   yield text
                            except json.JSONDecodeError:
                                continue 

            return StreamingHttpResponse(stream_response(), content_type="text/plain")

        except json.JSONDecodeError:
            return JsonResponse({"error": "Invalid JSON format"}, status=400)

        except Exception as e:
            return JsonResponse({"error": str(e)}, status=500)
