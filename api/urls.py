from django.urls import path
from .views import ask_ollama

urlpatterns = [
    path('ask/', ask_ollama, name='ask_ollama'),  # ✅ Make sure this exists
]
