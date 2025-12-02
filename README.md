# Personal Finance & Expense Analyzer with AI

An AI-powered personal finance dashboard that helps users:
- Add and track daily expenses
- Automatically categorize expenses using a Machine Learning model
- Visualize spending with charts
- Set monthly budgets
- Plan big purchases (like phone/laptop/trip) with a smart planner

This project is based on our mini research work at **ABES Engineering College**.

---

## 🧱 Tech Stack

**Frontend**
- React.js
- Chart.js (react-chartjs-2)

**Backend**
- Spring Boot (Java)
- REST APIs
- MongoDB (NoSQL database)

**AI / ML Service**
- Python
- Flask
- Scikit-Learn (Random Forest model)
- Joblib

**Other**
- Git & GitHub
- Local MongoDB

---

## 🌟 Features

- 💸 Add, edit, delete expenses (Amount, Description, Date, Category)
- 🤖 AI-based category suggestion (Food, Bills, Travel, Shopping, Other)
- 📊 Pie chart – Spending by category
- 📈 Bar chart – Monthly spending trends
- 🎯 Monthly budget setting + progress bar + warnings
- 🔮 Smart Purchase Planner
  - Enter salary + goal (e.g. “New Phone” + ₹ amount + month)
  - App calculates:
    - How much you can spend on each category this month
    - Whether goal is achievable or not
- 🧾 Export expenses as CSV
- 🌗 Dark / Light theme toggle
- 🔐 Simple frontend-only login/signup (for demo)

---

## 🏗️ Project Structure

```bash
Finance-AI-Analyzer/
├── frontend-react/        # React UI
├── backend-springboot/    # Spring Boot API (port 8081)
└── ml-model/              # Python Flask ML service (port 5000)
