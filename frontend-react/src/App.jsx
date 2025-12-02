import { useEffect, useState, useMemo, useRef } from "react";
import { Pie, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from "chart.js";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
);

const API_BASE = "http://localhost:8081";

const formatCurrency = (value) => `₹ ${Number(value || 0).toFixed(0)}`;

// core categories used in planner
const CORE_CATEGORIES = ["Food", "Bills", "Travel", "Shopping", "Other"];

// ===== THEMES =====
const THEMES = {
  dark: {
    name: "dark",
    bg: "#0f172a",
    cardBg: "#020617",
    border: "#1e293b",
    text: "#f9fafb",
    mutedText: "#9ca3af",
    shadow: "0 20px 45px rgba(15,23,42,0.9)",
    grid: "#111827",
  },
  light: {
    name: "light",
    bg: "#f3f4f6",
    cardBg: "#ffffff",
    border: "#e5e7eb",
    text: "#111827",
    mutedText: "#6b7280",
    shadow: "0 20px 45px rgba(148,163,184,0.7)",
    grid: "#e5e7eb",
  },
};

/* 🔐 Simple frontend-only auth (demo)
   - Users stored in localStorage
   - NOT secure, sirf college project demo ke liye
*/

function App() {
  // theme
  const [themeName, setThemeName] = useState("dark");
  const theme = THEMES[themeName];

  // auth
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authMode, setAuthMode] = useState("login"); // 'login' | 'signup'
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");

  // expense form
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState("");
  const [suggestedCategory, setSuggestedCategory] = useState("");
  const [expenses, setExpenses] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState("ALL");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("ALL");
  const [loadingAI, setLoadingAI] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // edit state
  const [editingId, setEditingId] = useState(null);

  // chart refs (for PNG download)
  const pieRef = useRef(null);
  const barRef = useRef(null);

  // monthly budget
  const [budgetByMonth, setBudgetByMonth] = useState({});
  const [budgetInput, setBudgetInput] = useState("");

  // 🔮 Smart Purchase Planner state
  const [plannerSalary, setPlannerSalary] = useState("");
  const [plannerGoalName, setPlannerGoalName] = useState("");
  const [plannerGoalAmount, setPlannerGoalAmount] = useState("");
  const [plannerMonth, setPlannerMonth] = useState("");
  const [plannerResult, setPlannerResult] = useState(null);

  // 🔽 NEW: planner minimize / maximize
  const [plannerCollapsed, setPlannerCollapsed] = useState(false);

  function toggleTheme() {
    setThemeName((prev) => (prev === "dark" ? "light" : "dark"));
  }

  // ===== AUTH LOGIC =====
  useEffect(() => {
    const storedUser = localStorage.getItem("finance_ai_user");
    if (storedUser) {
      setIsLoggedIn(true);
    }
  }, []);

  // budget load/save from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("finance_ai_budget");
    if (saved) {
      try {
        setBudgetByMonth(JSON.parse(saved));
      } catch (e) {
        console.error("Budget parse error", e);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("finance_ai_budget", JSON.stringify(budgetByMonth));
  }, [budgetByMonth]);

  function handleSignup(e) {
    e.preventDefault();
    setAuthError("");
    if (!authEmail || !authPassword) {
      setAuthError("Email aur password required hain.");
      return;
    }
    localStorage.setItem(
      "finance_ai_user",
      JSON.stringify({ email: authEmail, password: authPassword })
    );
    setIsLoggedIn(true);
  }

  function handleLogin(e) {
    e.preventDefault();
    setAuthError("");
    const stored = localStorage.getItem("finance_ai_user");
    if (!stored) {
      setAuthError("Pehle signup kijiye.");
      return;
    }
    const user = JSON.parse(stored);
    if (user.email === authEmail && user.password === authPassword) {
      setIsLoggedIn(true);
    } else {
      setAuthError("Galat email/password.");
    }
  }

  function handleLogout() {
    setIsLoggedIn(false);
  }

  // ===== EXPENSE & AI LOGIC =====

  useEffect(() => {
    if (isLoggedIn) {
      fetchExpenses();
    }
  }, [isLoggedIn]);

  async function fetchExpenses() {
    try {
      setError("");
      const res = await fetch(`${API_BASE}/api/expenses`);
      const data = await res.json();
      setExpenses(data);
    } catch (err) {
      setError("Failed to load expenses. Check backend (8081).");
      console.error(err);
    }
  }

  async function handleSuggestCategory() {
    if (!description.trim()) {
      setError("Pehle description likhiye.");
      return;
    }
    try {
      setError("");
      setLoadingAI(true);
      const res = await fetch(`${API_BASE}/api/ai/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          amount: parseFloat(amount) || 0,
        }),
      });
      if (!res.ok) {
        throw new Error("AI API error");
      }
      const data = await res.json();
      setSuggestedCategory(data.category);
      setCategory(data.category);
    } catch (err) {
      console.error(err);
      setError("AI se category fetch nahi ho pai. Flask (5000) check karo.");
    } finally {
      setLoadingAI(false);
    }
  }

  async function handleSaveExpense(e) {
    e.preventDefault();
    if (!amount || !description || !date || !category) {
      setError("Saare fields bharna zaroori hai.");
      return;
    }
    try {
      setError("");
      setSaving(true);

      const payload = {
        amount: parseFloat(amount),
        description,
        date,
        category,
      };

      let url = `${API_BASE}/api/expenses`;
      let method = "POST";

      if (editingId) {
        url = `${API_BASE}/api/expenses/${editingId}`;
        method = "PUT";
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        throw new Error("Save error");
      }
      await res.json();

      setAmount("");
      setDescription("");
      setDate("");
      setCategory("");
      setSuggestedCategory("");
      setEditingId(null);

      fetchExpenses();
    } catch (err) {
      console.error(err);
      setError("Expense save/update nahi ho paya. Backend/Mongo check karo.");
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(exp) {
    setEditingId(exp.id);
    setAmount(exp.amount);
    setDescription(exp.description);
    setDate(exp.date);
    setCategory(exp.category);
    setSuggestedCategory(exp.category);
    setError("");
  }

  async function handleDelete(id) {
    const sure = window.confirm(
      "Kya aap is expense ko delete karna chahte hain?"
    );
    if (!sure) return;

    try {
      setError("");
      await fetch(`${API_BASE}/api/expenses/${id}`, {
        method: "DELETE",
      });
      fetchExpenses();
    } catch (err) {
      console.error(err);
      setError("Delete nahi ho paya. Backend/Mongo check karo.");
    }
  }

  function handleCancelEdit() {
    setEditingId(null);
    setAmount("");
    setDescription("");
    setDate("");
    setCategory("");
    setSuggestedCategory("");
  }

  // ===== FILTER OPTIONS (MONTH + CATEGORY) =====

  const monthOptions = useMemo(() => {
    const set = new Set();
    expenses.forEach((exp) => {
      if (exp.date && exp.date.length >= 7) {
        set.add(exp.date.slice(0, 7)); // YYYY-MM
      }
    });
    return Array.from(set).sort();
  }, [expenses]);

  const categoryOptions = useMemo(() => {
    const set = new Set();
    expenses.forEach((exp) => {
      if (exp.category) set.add(exp.category);
    });
    return Array.from(set).sort();
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      const matchesMonth =
        selectedMonth === "ALL" ||
        (exp.date && exp.date.startsWith(selectedMonth));

      const matchesCategory =
        selectedCategoryFilter === "ALL" ||
        exp.category === selectedCategoryFilter;

      return matchesMonth && matchesCategory;
    });
  }, [expenses, selectedMonth, selectedCategoryFilter]);

  // ===== MONTHLY BUDGET CALCULATIONS =====

  const activeBudgetMonth =
    selectedMonth === "ALL" ? null : selectedMonth;

  const selectedMonthTotal = useMemo(() => {
    if (selectedMonth === "ALL") return 0;
    return expenses
      .filter(
        (exp) => exp.date && exp.date.startsWith(selectedMonth)
      )
      .reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  }, [expenses, selectedMonth]);

  const activeBudget = activeBudgetMonth
    ? budgetByMonth[activeBudgetMonth] || 0
    : 0;

  const budgetUsedPct = activeBudget
    ? Math.min(100, (selectedMonthTotal / activeBudget) * 100)
    : 0;

  // jab month change ho to input me us month ka budget aa jaye
  useEffect(() => {
    if (activeBudgetMonth && budgetByMonth[activeBudgetMonth]) {
      setBudgetInput(String(budgetByMonth[activeBudgetMonth]));
    } else {
      setBudgetInput("");
    }
  }, [activeBudgetMonth, budgetByMonth]);

  function handleSaveBudget() {
    if (!activeBudgetMonth) {
      alert("Select Month first.");
      return;
    }
    const val = parseFloat(budgetInput);
    if (isNaN(val) || val <= 0) {
      alert("Enter Valid amount budget.");
      return;
    }
    setBudgetByMonth((prev) => ({
      ...prev,
      [activeBudgetMonth]: val,
    }));
  }

  // ===== SUMMARY STATS (TOP CARDS) =====

  const stats = useMemo(() => {
    let total = 0;
    const byCat = {};
    expenses.forEach((exp) => {
      const amt = Number(exp.amount) || 0;
      total += amt;
      if (exp.category) {
        byCat[exp.category] = (byCat[exp.category] || 0) + amt;
      }
    });

    const get = (name) => byCat[name] || 0;
    return {
      total,
      bills: get("Bills"),
      travel: get("Travel"),
      shopping: get("Shopping"),
      food: get("Food"),
    };
  }, [expenses]);

  // ===== PIE CHART DATA (FILTERED) =====

  const pieData = useMemo(() => {
    const totals = {};
    filteredExpenses.forEach((exp) => {
      if (!exp.category) return;
      totals[exp.category] = (totals[exp.category] || 0) + exp.amount;
    });

    const labels = Object.keys(totals);
    const values = Object.values(totals);

    return {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: [
            "#22c55e",
            "#3b82f6",
            "#f97316",
            "#e11d48",
            "#a855f7",
            "#14b8a6",
          ],
          borderColor: theme.bg,
          borderWidth: 2,
        },
      ],
    };
  }, [filteredExpenses, theme.bg]);

  // ===== MONTHLY BAR CHART DATA (ALL EXPENSES) =====

  const monthlyBarData = useMemo(() => {
    const totals = {};
    expenses.forEach((exp) => {
      if (!exp.date) return;
      const month = exp.date.slice(0, 7); // YYYY-MM
      const amt = Number(exp.amount) || 0;
      totals[month] = (totals[month] || 0) + amt;
    });

    const labels = Object.keys(totals).sort();
    const values = labels.map((m) => totals[m]);

    return {
      labels,
      datasets: [
        {
          label: "Monthly Spending (₹)",
          data: values,
          backgroundColor: "#3b82f6",
          borderRadius: 6,
        },
      ],
    };
  }, [expenses]);

  // ===== DOWNLOAD PNG HELPERS =====

  function downloadChartAsPNG(ref, filename) {
    const chart = ref.current;
    if (!chart) return;
    const url = chart.toBase64Image();
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
  }

  // ===== EXPORT CSV (ALL EXPENSES) – date as text =====

  function exportExpensesCSV() {
    if (!expenses.length) {
      alert("Abhi koi expenses nahi hai export karne ke liye.");
      return;
    }

    const header = ["Date", "Description", "Category", "Amount (₹)"];

    const rows = expenses.map((exp) => [
      exp.date ? "'" + exp.date : "", // Excel me text banane ke liye
      exp.description || "",
      exp.category || "",
      exp.amount ?? "",
    ]);

    const csvRows = [header, ...rows]
      .map((row) =>
        row
          .map((val) => {
            const v = String(val ?? "");
            const escaped = v.replace(/"/g, '""');
            return `"${escaped}"`;
          })
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csvRows], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "expenses-export.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // ===== 🔮 SMART PURCHASE PLANNER LOGIC =====

  function handleCalculatePlan() {
    if (!plannerMonth) {
      alert("Pehle target month choose karo.");
      return;
    }

    const salary = Number(plannerSalary);
    const goalAmt = Number(plannerGoalAmount);

    if (!salary || salary <= 0 || !goalAmt || goalAmt <= 0) {
      alert("Salary aur goal amount dono positive number hone chahiye.");
      return;
    }

    // 1. Kitna paisa goal ke baad bachta hai?
    const leftover = salary - goalAmt;

    // 2. Is month me abhi tak kitna kharch ho chuka hai?
    const monthExpenses = expenses.filter(
      (exp) => exp.date && exp.date.startsWith(plannerMonth)
    );
    const spentSoFar = monthExpenses.reduce(
      (sum, exp) => sum + (Number(exp.amount) || 0),
      0
    );

    // 3. Historical category pattern se recommended category budgets
    const totalsByCat = {};
    let totalAll = 0;
    expenses.forEach((exp) => {
      const amt = Number(exp.amount) || 0;
      totalAll += amt;
      const cat = exp.category || "Other";
      totalsByCat[cat] = (totalsByCat[cat] || 0) + amt;
    });

    const defaultShares = {
      Food: 0.35,
      Bills: 0.3,
      Travel: 0.2,
      Shopping: 0.1,
      Other: 0.05,
    };

    // 1) pehle exact (decimal) budgets nikaalo
    const rawBudgets = {};
    CORE_CATEGORIES.forEach((cat) => {
      let share;
      if (totalAll > 0) {
        share = (totalsByCat[cat] || 0) / totalAll;
      } else {
        share =
          defaultShares[cat] !== undefined
            ? defaultShares[cat]
            : 1 / CORE_CATEGORIES.length;
      }
      rawBudgets[cat] = Math.max(0, leftover * share);
    });

    // 2) sabko round karke integer banao
    const budgetsByCat = {};
    let sumRounded = 0;
    CORE_CATEGORIES.forEach((cat) => {
      const rounded = Math.round(rawBudgets[cat]); // ya Math.floor
      budgetsByCat[cat] = rounded;
      sumRounded += rounded;
    });

    // 3) diff ko largest category me adjust karo taaki total exactly match ho
    const diff = Math.round(leftover - sumRounded);
    if (diff !== 0) {
      const mainCat = CORE_CATEGORIES.reduce(
        (best, cat) =>
          rawBudgets[cat] > (rawBudgets[best] || 0) ? cat : best,
        CORE_CATEGORIES[0]
      );
      budgetsByCat[mainCat] += diff;
    }

    const overshoot = Math.max(0, spentSoFar - leftover);
    const canAchieve = leftover > 0 && overshoot === 0;

    setPlannerResult({
      salary,
      goalAmt,
      leftover,
      month: plannerMonth,
      goalName: plannerGoalName || "Goal",
      spentSoFar,
      budgetsByCat,
      canAchieve,
      overshoot,
    });
  }

  // ===== STYLES DERIVED FROM THEME =====

  const themedInputStyle = {
    ...baseInputStyle,
    border: `1px solid ${theme.border}`,
    background: theme.cardBg,
    color: theme.text,
  };

  const themedAuthTabStyle = {
    ...baseAuthTabStyle,
    border: `1px solid ${theme.border}`,
    color: theme.text,
  };

  const themedThStyle = {
    ...baseThStyle,
    background: theme.cardBg,
    borderBottom: `1px solid ${theme.border}`,
    color: theme.text,
  };

  const themedTdStyle = {
    ...baseTdStyle,
    borderBottom: `1px solid ${theme.border}`,
    color: theme.text,
  };

  // ===== RENDER (AUTH / LOGIN) =====

  if (!isLoggedIn) {
    return (
      <div
        style={{
          width: "100%",
          minHeight: "100vh",
          background: theme.bg,
          color: theme.text,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
          padding: "1rem",
          overflowX: "hidden",
        }}
      >
        <HoverPanel
          theme={theme}
          style={{
            padding: "2rem",
            width: "100%",
            maxWidth: "380px",
          }}
        >
          <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>
            Finance AI Analyzer
          </h1>
          <p
            style={{
              opacity: 0.8,
              marginBottom: "1rem",
              fontSize: "0.9rem",
              color: theme.mutedText,
            }}
          >
            Simple demo login / signup (frontend only).
          </p>

          <div style={{ marginBottom: "1rem" }}>
            <button
              onClick={() => setAuthMode("login")}
              style={{
                ...themedAuthTabStyle,
                background: authMode === "login" ? "#0ea5e9" : "transparent",
              }}
            >
              Login
            </button>
            <button
              onClick={() => setAuthMode("signup")}
              style={{
                ...themedAuthTabStyle,
                background: authMode === "signup" ? "#0ea5e9" : "transparent",
              }}
            >
              Signup
            </button>
          </div>

          {authError && (
            <div
              style={{
                background: "#fecaca",
                color: "#7f1d1d",
                padding: "0.5rem 0.75rem",
                borderRadius: "0.5rem",
                marginBottom: "0.75rem",
                fontSize: "0.85rem",
              }}
            >
              {authError}
            </div>
          )}

          <form onSubmit={authMode === "login" ? handleLogin : handleSignup}>
            <div style={{ marginBottom: "0.75rem" }}>
              <label style={{ fontSize: "0.85rem" }}>Email</label>
              <input
                type="email"
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                style={themedInputStyle}
              />
            </div>
            <div style={{ marginBottom: "0.75rem" }}>
              <label style={{ fontSize: "0.85rem" }}>Password</label>
              <input
                type="password"
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                style={themedInputStyle}
              />
            </div>
            <button
              type="submit"
              style={{
                ...buttonStyle,
                width: "100%",
                background: "#22c55e",
                borderColor: "#22c55e",
                marginTop: "0.25rem",
              }}
            >
              {authMode === "login" ? "Login" : "Signup & Continue"}
            </button>
          </form>
        </HoverPanel>
      </div>
    );
  }

  // ===== MAIN DASHBOARD (after login) =====

  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        background: theme.bg,
        color: theme.text,
        padding: "2rem 1.5rem",
        fontFamily:
          "system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
        overflowX: "hidden",
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginBottom: "1.5rem",
            alignItems: "center",
            gap: "1rem",
          }}
        >
          <div>
            <h1 style={{ fontSize: "2rem", marginBottom: "0.3rem" }}>
              Finance AI Analyzer
            </h1>
            <p style={{ marginBottom: 0, color: theme.mutedText }}>
              Add expenses, let AI suggest categories, and see your history.
            </p>
          </div>
          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              alignItems: "center",
            }}
          >
            <HoverButton
              style={{
                background: themeName === "dark" ? "#e5e7eb" : "#0f172a",
                borderColor: "transparent",
                color: themeName === "dark" ? "#111827" : "#f9fafb",
              }}
            >
              <span onClick={toggleTheme}>
                {themeName === "dark" ? "Light Mode" : "Dark Mode"}
              </span>
            </HoverButton>
            <HoverButton
              style={{
                background: "#ef4444",
                borderColor: "#ef4444",
                whiteSpace: "nowrap",
              }}
              onClick={handleLogout}
            >
              Logout
            </HoverButton>
          </div>
        </div>

        {/* Summary cards row */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "1rem",
            marginBottom: "1.5rem",
          }}
        >
          <SummaryCard
            title="Total Spending"
            value={formatCurrency(stats.total)}
          />
          <SummaryCard title="Bills" value={formatCurrency(stats.bills)} />
          <SummaryCard title="Travel" value={formatCurrency(stats.travel)} />
          <SummaryCard
            title="Shopping"
            value={formatCurrency(stats.shopping)}
          />
          <SummaryCard title="Food" value={formatCurrency(stats.food)} />
        </div>

        {/* 🔮 Smart Purchase Planner */}
        <HoverPanel
          theme={theme}
          style={{
            padding: "1.25rem 1.5rem",
            marginBottom: "1.5rem",
          }}
        >
          {/* Header + Min/Max button */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "1rem",
              marginBottom: plannerCollapsed ? 0 : "1rem",
              flexWrap: "wrap",
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: "1.25rem" }}>
                Smart Purchase Planner
              </h2>
              <p
                style={{
                  opacity: 0.9,
                  fontSize: "0.9rem",
                  marginTop: "0.3rem",
                  marginBottom: 0,
                  color: theme.mutedText,
                }}
              >
                Enter your monthly salary, the amount of the item you want to
                buy, and the target month. The app will tell you how much you
                can spend at most in each category this month so that you can
                afford the item by the end.
              </p>
            </div>

            <HoverSmallButton
              type="button"
              onClick={() => setPlannerCollapsed((c) => !c)}
              style={{
                background: "transparent",
                borderColor: theme.border,
                color: theme.text,
                minWidth: 90,
              }}
            >
              {plannerCollapsed ? "Maximize" : "Minimize"}
            </HoverSmallButton>
          </div>

          {/* Planner content only when not collapsed */}
          {!plannerCollapsed && (
            <>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "0.75rem",
                  marginBottom: "1rem",
                  marginTop: "1rem",
                }}
              >
                <div>
                  <label>Monthly Salary (₹)</label>
                  <input
                    type="number"
                    value={plannerSalary}
                    onChange={(e) => setPlannerSalary(e.target.value)}
                    style={themedInputStyle}
                  />
                </div>

                <div>
                  <label>Item / Goal Name</label>
                  <input
                    type="text"
                    placeholder="iPhone, Laptop, Trip..."
                    value={plannerGoalName}
                    onChange={(e) => setPlannerGoalName(e.target.value)}
                    style={themedInputStyle}
                  />
                </div>

                <div>
                  <label>Goal Amount (₹)</label>
                  <input
                    type="number"
                    value={plannerGoalAmount}
                    onChange={(e) => setPlannerGoalAmount(e.target.value)}
                    style={themedInputStyle}
                  />
                </div>

                <div>
                  <label>Target Month</label>
                  <input
                    type="month"
                    value={plannerMonth}
                    onChange={(e) => setPlannerMonth(e.target.value)}
                    style={themedInputStyle}
                  />
                </div>
              </div>

              <HoverButton
                type="button"
                onClick={handleCalculatePlan}
                style={{
                  background: "#22c55e",
                  borderColor: "#22c55e",
                  padding: "0.6rem 1.1rem",
                }}
              >
                Calculate Plan
              </HoverButton>

              {plannerResult && (
                <div style={{ marginTop: "1.25rem" }}>
                  <h3
                    style={{
                      fontSize: "1rem",
                      marginBottom: "0.6rem",
                    }}
                  >
                    Plan for{" "}
                    <span style={{ fontWeight: 600 }}>
                      {plannerResult.goalName}
                    </span>{" "}
                    ({plannerResult.month})
                  </h3>

                  {/* Small summary cards inside planner */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(180px, 1fr))",
                      gap: "0.75rem",
                      marginBottom: "1rem",
                    }}
                  >
                    {[
                      {
                        label: "Monthly Salary",
                        val: formatCurrency(plannerResult.salary),
                      },
                      {
                        label: "Goal Cost",
                        val: formatCurrency(plannerResult.goalAmt),
                      },
                      {
                        label: "Money left for other expenses",
                        val: formatCurrency(
                          Math.max(0, plannerResult.leftover)
                        ),
                      },
                      {
                        label: "Spent so far this month",
                        val: formatCurrency(plannerResult.spentSoFar),
                      },
                    ].map((card) => (
                      <div
                        key={card.label}
                        style={{
                          background:
                            theme.name === "dark" ? "#020617" : "#f9fafb",
                          borderRadius: "0.75rem",
                          border: `1px solid ${theme.border}`,
                          padding: "0.75rem 1rem",
                        }}
                      >
                        <p
                          style={{
                            margin: 0,
                            fontSize: "0.85rem",
                            color: theme.mutedText,
                            marginBottom: "0.25rem",
                          }}
                        >
                          {card.label}
                        </p>
                        <p
                          style={{
                            margin: 0,
                            fontWeight: 600,
                            fontSize: "1rem",
                          }}
                        >
                          {card.val}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Status message */}
                  {plannerResult.leftover <= 0 ? (
                    <p
                      style={{
                        color: "#fecaca",
                        marginBottom: "0.75rem",
                        fontSize: "0.9rem",
                      }}
                    >
                      With this salary, achieving this goal is not possible this
                      month.{" "}
                      <strong>
                        {formatCurrency(Math.abs(plannerResult.leftover))}
                      </strong>{" "}
                      You will need extra income/savings.
                    </p>
                  ) : plannerResult.canAchieve ? (
                    <p
                      style={{
                        color: "#bbf7d0",
                        marginBottom: "0.75rem",
                        fontSize: "0.9rem",
                      }}
                    >
                      Great! If you follow the recommended limits,{" "}
                      <strong>{plannerResult.goalName}</strong> you’ll be able to easily afford the phone this month. 🎯
                    </p>
                  ) : (
                    <p
                      style={{
                        color: "#fed7aa",
                        marginBottom: "0.75rem",
                        fontSize: "0.9rem",
                      }}
                    >
                      You have already spent more than the{" "}
                      <strong>
                        {formatCurrency(plannerResult.overshoot)}
                      </strong>{" "}
                      recommended limit this month. To achieve your goal, you’ll
                      need to control your expenses a bit.
                    </p>
                  )}

                  {/* Category wise recommended budgets */}
                  <h4
                    style={{
                      fontSize: "0.95rem",
                      marginBottom: "0.5rem",
                      marginTop: "0.25rem",
                    }}
                  >
                    Recommended maximum spending this month (per category)
                  </h4>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(auto-fit, minmax(150px, 1fr))",
                      gap: "0.6rem",
                    }}
                  >
                    {CORE_CATEGORIES.map((cat) => (
                      <div
                        key={cat}
                        style={{
                          padding: "0.6rem 0.8rem",
                          borderRadius: "0.75rem",
                          border: `1px solid ${theme.border}`,
                          background: theme.cardBg,
                        }}
                      >
                        <p
                          style={{
                            margin: 0,
                            fontSize: "0.85rem",
                            color: theme.mutedText,
                            marginBottom: "0.2rem",
                          }}
                        >
                          {cat}
                        </p>
                        <p
                          style={{
                            margin: 0,
                            fontSize: "1rem",
                            fontWeight: 600,
                          }}
                        >
                          {formatCurrency(
                            plannerResult.budgetsByCat[cat] || 0
                          )}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </HoverPanel>

        {/* Monthly Budget Panel */}
        <HoverPanel
          theme={theme}
          style={{
            padding: "1rem 1.25rem",
            marginBottom: "1.5rem",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "1rem",
              flexWrap: "wrap",
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: "1.1rem",
                  margin: 0,
                }}
              >
                Monthly Budget
              </h2>
              <p
                style={{
                  margin: 0,
                  marginTop: "0.25rem",
                  fontSize: "0.85rem",
                  color: theme.mutedText,
                }}
              >
                {selectedMonth === "ALL"
                  ? "Select month to set budget."
                  : `Selected month: ${selectedMonth}`}
              </p>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                flexWrap: "wrap",
              }}
            >
              <input
                type="number"
                placeholder="₹ Budget"
                value={budgetInput}
                onChange={(e) => setBudgetInput(e.target.value)}
                style={{
                  ...themedInputStyle,
                  width: "140px",
                }}
              />
              <HoverButton
                type="button"
                onClick={handleSaveBudget}
                style={{
                  background: "#22c55e",
                  borderColor: "#22c55e",
                }}
              >
                Save Budget
              </HoverButton>
            </div>
          </div>

          {activeBudgetMonth && activeBudget > 0 && (
            <div style={{ marginTop: "0.75rem" }}>
              <div
                style={{
                  height: 10,
                  borderRadius: 999,
                  background:
                    theme.name === "dark" ? "#020617" : "#e5e7eb",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${budgetUsedPct}%`,
                    height: "100%",
                    borderRadius: 999,
                    background:
                      budgetUsedPct < 70
                        ? "linear-gradient(90deg,#22c55e,#16a34a)"
                        : budgetUsedPct < 100
                        ? "linear-gradient(90deg,#f97316,#ea580c)"
                        : "linear-gradient(90deg,#ef4444,#b91c1c)",
                    transition: "width 0.3s ease",
                  }}
                />
              </div>
              <div
                style={{
                  marginTop: "0.4rem",
                  fontSize: "0.8rem",
                  display: "flex",
                  justifyContent: "space-between",
                  color: theme.mutedText,
                }}
              >
                <span>Spent: {formatCurrency(selectedMonthTotal)}</span>
                <span>Budget: {formatCurrency(activeBudget)}</span>
              </div>

              {budgetUsedPct >= 100 ? (
                <p
                  style={{
                    marginTop: "0.3rem",
                    fontSize: "0.8rem",
                    color: "#f97316",
                  }}
                >
                  You have crossed the budget for this month!
                </p>
              ) : budgetUsedPct >= 80 ? (
                <p
                  style={{
                    marginTop: "0.3rem",
                    fontSize: "0.8rem",
                    color: "#facc15",
                  }}
                >
                  Warning: {budgetUsedPct.toFixed(0)}% of budget used.
                </p>
              ) : null}
            </div>
          )}
        </HoverPanel>

        {error && (
          <div
            style={{
              background: "#fecaca",
              color: "#7f1d1d",
              padding: "0.75rem 1rem",
              borderRadius: "0.5rem",
              marginBottom: "1rem",
            }}
          >
            {error}
          </div>
        )}

        {/* Top row: form + chart */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
            gap: "1.5rem",
            marginBottom: "1.5rem",
            alignItems: "stretch",
          }}
        >
          {/* LEFT: Form */}
          <HoverPanel theme={theme} style={{ padding: "1.5rem" }}>
            <h2 style={{ marginBottom: "1rem", fontSize: "1.25rem" }}>
              {editingId ? "Edit Expense" : "Add Expense"}
            </h2>

            <form
              onSubmit={handleSaveExpense}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              <div>
                <label>Amount (₹)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  style={themedInputStyle}
                />
              </div>

              <div>
                <label>Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  style={{ ...themedInputStyle, resize: "vertical" }}
                />
              </div>

              <div>
                <label>Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  style={themedInputStyle}
                />
              </div>

              <div>
                <label>Category</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Food, Travel, Bills, Shopping..."
                  style={themedInputStyle}
                />
                {suggestedCategory && (
                  <p style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>
                    AI suggested:{" "}
                    <span style={{ fontWeight: 600 }}>
                      {suggestedCategory}
                    </span>
                  </p>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "0.75rem",
                  marginTop: "0.5rem",
                  flexWrap: "wrap",
                }}
              >
                <HoverButton
                  type="button"
                  onClick={handleSuggestCategory}
                  disabled={loadingAI}
                  style={{
                    background: "#0ea5e9",
                    borderColor: "#0ea5e9",
                  }}
                >
                  {loadingAI ? "Asking AI..." : "Suggest Category with AI"}
                </HoverButton>

                <HoverButton
                  type="submit"
                  disabled={saving}
                  style={{
                    background: "#22c55e",
                    borderColor: "#22c55e",
                  }}
                >
                  {saving
                    ? editingId
                      ? "Updating..."
                      : "Saving..."
                    : editingId
                    ? "Update Expense"
                    : "Save Expense"}
                </HoverButton>

                {editingId && (
                  <HoverButton
                    type="button"
                    onClick={handleCancelEdit}
                    style={{
                      background: "#6b7280",
                      borderColor: "#6b7280",
                    }}
                  >
                    Cancel Edit
                  </HoverButton>
                )}
              </div>
            </form>
          </HoverPanel>

          {/* RIGHT: Pie chart */}
          <HoverPanel theme={theme} style={{ padding: "1.5rem" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "0.75rem",
                alignItems: "center",
                gap: "0.75rem",
                flexWrap: "wrap",
              }}
            >
              <h2 style={{ fontSize: "1.25rem" }}>Spending by Category</h2>
              <div
                style={{
                  display: "flex",
                  gap: "0.75rem",
                  alignItems: "center",
                  flexWrap: "wrap",
                  justifyContent: "flex-end",
                }}
              >
                <div>
                  <label
                    style={{ fontSize: "0.85rem", marginRight: "0.35rem" }}
                  >
                    Month:
                  </label>
                  <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    style={{
                      ...themedInputStyle,
                      width: "auto",
                      padding: "0.3rem 0.6rem",
                      display: "inline-block",
                    }}
                  >
                    <option value="ALL">All</option>
                    {monthOptions.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    style={{ fontSize: "0.85rem", marginRight: "0.35rem" }}
                  >
                    Category:
                  </label>
                  <select
                    value={selectedCategoryFilter}
                    onChange={(e) =>
                      setSelectedCategoryFilter(e.target.value)
                    }
                    style={{
                      ...themedInputStyle,
                      width: "auto",
                      padding: "0.3rem 0.6rem",
                      display: "inline-block",
                    }}
                  >
                    <option value="ALL">All</option>
                    {categoryOptions.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <HoverButton
                  type="button"
                  style={{
                    background: "transparent",
                    borderColor: theme.border,
                    color: theme.text,
                  }}
                  onClick={() =>
                    downloadChartAsPNG(pieRef, "category-spending.png")
                  }
                >
                  Download PNG
                </HoverButton>
              </div>
            </div>

            {filteredExpenses.length === 0 ? (
              <p style={{ color: theme.mutedText }}>
                Is selection ke liye koi expense nahi hai.
              </p>
            ) : pieData.labels.length === 0 ? (
              <p style={{ color: theme.mutedText }}>
                Categories missing hain. Kuch expenses me category add karke
                try karein.
              </p>
            ) : (
              <div style={{ height: 320 }}>
                <Pie
                  ref={pieRef}
                  data={pieData}
                  options={{
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        labels: {
                          color: theme.text,
                        },
                      },
                    },
                  }}
                />
              </div>
            )}
          </HoverPanel>
        </div>

        {/* Bottom: Monthly chart + Table */}
        <HoverPanel
          theme={theme}
          style={{
            padding: "1.5rem",
            marginBottom: "1rem",
          }}
        >
          {monthlyBarData.labels.length > 0 && (
            <div style={{ marginBottom: "1.5rem", height: 260 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.5rem",
                  gap: "0.75rem",
                  flexWrap: "wrap",
                }}
              >
                <h3 style={{ fontSize: "1rem" }}>Monthly Spending Trend</h3>
                <HoverButton
                  type="button"
                  style={{
                    background: "transparent",
                    borderColor: theme.border,
                    color: theme.text,
                  }}
                  onClick={() =>
                    downloadChartAsPNG(barRef, "monthly-spending.png")
                  }
                >
                  Download PNG
                </HoverButton>
              </div>

              <Bar
                ref={barRef}
                data={monthlyBarData}
                options={{
                  maintainAspectRatio: false,
                  plugins: {
                    legend: { display: false },
                  },
                  scales: {
                    x: {
                      ticks: { color: theme.text },
                      grid: { color: theme.grid },
                    },
                    y: {
                      ticks: { color: theme.text },
                      grid: { color: theme.grid },
                    },
                  },
                }}
              />
            </div>
          )}

          {/* Table header + CSV export */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1rem",
              gap: "0.75rem",
              flexWrap: "wrap",
            }}
          >
            <h2 style={{ fontSize: "1.25rem" }}>Expense History</h2>
            <HoverButton
              type="button"
              style={{
                background: "transparent",
                borderColor: theme.border,
                color: theme.text,
              }}
              onClick={exportExpensesCSV}
            >
              Export CSV
            </HoverButton>
          </div>

          {filteredExpenses.length === 0 ? (
            <p style={{ color: theme.mutedText }}>
              No expenses yet. Add your first one!
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "0.9rem",
                }}
              >
                <thead>
                  <tr>
                    <th style={themedThStyle}>Date</th>
                    <th style={themedThStyle}>Description</th>
                    <th style={themedThStyle}>Category</th>
                    <th style={themedThStyle}>Amount (₹)</th>
                    <th style={themedThStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.map((exp) => (
                    <tr
                      key={exp.id}
                      style={{
                        transition: "background 0.2s ease",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background =
                          themeName === "dark" ? "#020617" : "#e5e7eb";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <td style={themedTdStyle}>{exp.date}</td>
                      <td style={themedTdStyle}>{exp.description}</td>
                      <td style={themedTdStyle}>{exp.category}</td>
                      <td style={themedTdStyle}>{exp.amount}</td>
                      <td style={themedTdStyle}>
                        <HoverSmallButton
                          style={{
                            background: "#0ea5e9",
                            borderColor: "#0ea5e9",
                            marginRight: "0.4rem",
                          }}
                          onClick={() => handleEdit(exp)}
                        >
                          Edit
                        </HoverSmallButton>
                        <HoverSmallButton
                          style={{
                            background: "#ef4444",
                            borderColor: "#ef4444",
                          }}
                          onClick={() => handleDelete(exp.id)}
                        >
                          Delete
                        </HoverSmallButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </HoverPanel>
      </div>
    </div>
  );
}

/* ===== Summary card with premium hover ===== */

function SummaryCard({ title, value }) {
  const [hover, setHover] = useState(false);

  const baseStyle = {
    background: "#020617",
    padding: "1rem 1.25rem",
    borderRadius: "1rem",
    border: "1px solid #1e293b",
    transition: "all 0.25s ease",
    cursor: "pointer",
  };

  const hoverStyle = hover
    ? {
        transform: "translateY(-6px) scale(1.02)",
        boxShadow: "0 18px 40px rgba(15,23,42,0.9)",
        borderColor: "#38bdf8",
      }
    : {};

  return (
    <div
      style={{ ...baseStyle, ...hoverStyle }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <p
        style={{
          margin: 0,
          fontSize: "0.9rem",
          color: "#9ca3af",
        }}
      >
        {title}
      </p>
      <p
        style={{
          margin: 0,
          marginTop: "0.35rem",
          fontSize: "1.3rem",
          fontWeight: 700,
          background: "linear-gradient(90deg,#38bdf8,#22c55e)",
          WebkitBackgroundClip: "text",
          color: "transparent",
        }}
      >
        {value}
      </p>
    </div>
  );
}

/* ===== generic hover panel for big containers ===== */

function HoverPanel({ children, theme, style }) {
  const [hover, setHover] = useState(false);

  const base = {
    background: theme.cardBg,
    borderRadius: "1rem",
    border: `1px solid ${theme.border}`,
    transition: "all 0.25s ease",
  };

  const hoverStyle = hover
    ? {
        transform: "translateY(-5px)",
        boxShadow: theme.shadow,
        borderColor: "#38bdf8",
      }
    : {};

  return (
    <div
      style={{ ...base, ...hoverStyle, ...style }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {children}
    </div>
  );
}

/* ===== Buttons with hover zoom + glow ===== */

function HoverButton({ children, style, ...rest }) {
  const [hover, setHover] = useState(false);

  const base = {
    ...buttonStyle,
    ...style,
    transition: "all 0.2s ease",
  };

  const hoverStyle = hover
    ? {
        transform: "scale(1.05)",
        boxShadow: "0 0 18px rgba(56,189,248,0.6)",
      }
    : {};

  return (
    <button
      {...rest}
      style={{ ...base, ...hoverStyle }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {children}
    </button>
  );
}

function HoverSmallButton({ children, style, ...rest }) {
  const [hover, setHover] = useState(false);

  const base = {
    ...smallButton,
    ...style,
    transition: "all 0.2s ease",
  };

  const hoverStyle = hover
    ? {
        transform: "scale(1.05)",
        boxShadow: "0 0 12px rgba(248,113,113,0.6)",
      }
    : {};

  return (
    <button
      {...rest}
      style={{ ...base, ...hoverStyle }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {children}
    </button>
  );
}

/* ===== base styles (theme-independent) ===== */

const baseInputStyle = {
  width: "100%",
  padding: "0.5rem 0.6rem",
  borderRadius: "0.5rem",
  border: "1px solid #1e293b",
  background: "#020617",
  color: "white",
  marginTop: "0.25rem",
};

const buttonStyle = {
  padding: "0.55rem 0.9rem",
  borderRadius: "999px",
  border: "1px solid transparent",
  color: "white",
  cursor: "pointer",
  fontSize: "0.9rem",
};

const smallButton = {
  padding: "0.3rem 0.6rem",
  borderRadius: "999px",
  border: "1px solid transparent",
  color: "white",
  cursor: "pointer",
  fontSize: "0.8rem",
};

const baseThStyle = {
  textAlign: "left",
  padding: "0.5rem",
  borderBottom: "1px solid #1f2933",
  background: "#020617",
  position: "sticky",
  top: 0,
};

const baseTdStyle = {
  padding: "0.4rem 0.5rem",
  borderBottom: "1px solid #111827",
};

const baseAuthTabStyle = {
  borderRadius: "999px",
  padding: "0.3rem 0.8rem",
  border: "1px solid #1e293b",
  fontSize: "0.85rem",
  color: "white",
  cursor: "pointer",
  marginRight: "0.4rem",
  background: "transparent",
};

export default App;
