import axios from "axios";

const API_BASE_URL = "http://127.0.0.1:8000/api/ask/";

export const askOllama = async (prompt) => {
    try {
        const response = await axios.post(
            "http://127.0.0.1:8000/api/ask/",
            { prompt },
            { headers: { "Content-Type": "application/json" } }
        );

        console.log("API Response:", response.data);
        return typeof response.data.response === "string"
            ? response.data.response
            : JSON.stringify(response.data.response); // ✅ Convert objects to string
    } catch (error) {
        console.error("Error:", error.response?.data || error.message);
        return "Error fetching response.";
    }
};

