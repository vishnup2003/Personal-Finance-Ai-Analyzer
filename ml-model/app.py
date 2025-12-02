from flask import Flask, request, jsonify
import joblib

# 1. Flask app create
app = Flask(__name__)

# 2. Model load karo (Step 5 me jo save kiya tha)
model = joblib.load("expense_model.pkl")
print("Model loaded in Flask app")

# 3. Simple route to check service is running
@app.route("/", methods=["GET"])
def home():
    return "ML Expense Service is running"

# 4. Main prediction route
@app.route("/predict", methods=["POST"])
def predict():
    # JSON body expect: {"description": "pizza from dominos"}
    data = request.get_json()

    if not data or "description" not in data:
        return jsonify({"error": "description field is required"}), 400

    description = data["description"]

    # Model se prediction
    predicted_category = model.predict([description])[0]

    # JSON response
    return jsonify({
        "description": description,
        "category": predicted_category
    })

if __name__ == "__main__":
    # debug=True sirf development ke liye
    app.run(host="0.0.0.0", port=5000, debug=True)
