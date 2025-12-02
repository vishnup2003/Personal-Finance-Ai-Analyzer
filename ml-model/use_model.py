import joblib

# 1. Load the saved model
model = joblib.load("expense_model.pkl")
print("Model loaded successfully!")

# 2. Loop to test predictions
while True:
    text = input("Enter expense description (or type exit): ")

    if text.lower() == "exit":
        print("Exiting...")
        break

    prediction = model.predict([text])
    print("Predicted Category:", prediction[0])
