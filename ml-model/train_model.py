from sklearn.feature_extraction.text import CountVectorizer
from sklearn.naive_bayes import MultinomialNB
from sklearn.pipeline import Pipeline
import joblib

# 1. Small training dataset (demo)
training_sentences = [
    "pizza",
    "burger",
    "sandwich",
    "momos",
    "biryani",
    "uber ride",
    "bus ticket",
    "flight booking",
    "train ticket",
    "electricity bill",
    "water bill",
    "internet recharge",
    "mobile recharge",
    "shoes shopping",
    "clothes shopping",
    "amazon order"
]

training_labels = [
    "Food",
    "Food",
    "Food",
    "Food",
    "Food",
    "Travel",
    "Travel",
    "Travel",
    "Travel",
    "Bills",
    "Bills",
    "Bills",
    "Bills",
    "Shopping",
    "Shopping",
    "Shopping"
]

# 2. Build a pipeline: text -> vector -> classifier
model = Pipeline([
    ("vectorizer", CountVectorizer()),
    ("classifier", MultinomialNB())
])

# 3. Train the model
model.fit(training_sentences, training_labels)

# 4. Save the whole pipeline to a file
joblib.dump(model, "expense_model.pkl")

print("Model trained and saved as expense_model.pkl")
