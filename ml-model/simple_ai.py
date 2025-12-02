from sklearn.feature_extraction.text import CountVectorizer
from sklearn.naive_bayes import MultinomialNB

# 1. Training data (very small demo dataset)
training_sentences = [
    "pizza",
    "burger",
    "sandwich",
    "uber ride",
    "bus ticket",
    "flight booking",
    "electricity bill",
    "water bill",
    "internet recharge",
    "shoes shopping",
    "clothes shopping"
]

training_labels = [
    "Food",
    "Food",
    "Food",
    "Travel",
    "Travel",
    "Travel",
    "Bills",
    "Bills",
    "Bills",
    "Shopping",
    "Shopping"
]

# 2. Convert text to numbers
vectorizer = CountVectorizer()
X = vectorizer.fit_transform(training_sentences)

# 3. Train the model
model = MultinomialNB()
model.fit(X, training_labels)

# 4. Test the AI
while True:
    user_input = input("Enter your expense description (or type exit): ")

    if user_input.lower() == "exit":
        print("Exiting AI...")
        break

    user_vector = vectorizer.transform([user_input])
    prediction = model.predict(user_vector)

    print("Predicted Category:", prediction[0])
