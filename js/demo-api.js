/**
 * SPENDWISE - Demo API
 * Browser-local implementation used when the app is served as a static site
 * (GitHub Pages), where the Express/MongoDB backend cannot run.
 * Data is persisted in localStorage for the current browser only.
 */

const STORAGE_KEY = 'spendwise.demo.v1';

export const DEMO_ACCOUNT = {
  email: 'demo@spendwise.app',
  password: 'demo1234'
};

const CATEGORY_COLORS = {
  'Housing': '#5B9DFF',
  'Food & Dining': '#2EE6A8',
  'Transport': '#A78BFA',
  'Entertainment': '#FF6B81',
  'Shopping': '#F6C453',
  'Education': '#22D3EE',
  'Healthcare': '#FB7185',
  'Utilities': '#60A5FA',
  'Salary': '#2EE6A8',
  'Investment': '#12C99B',
  'Other': '#7C8AA0'
};

export function isDemoMode() {
  if (window.SPENDWISE_DEMO === false) return false;
  if (window.SPENDWISE_DEMO === true) return true;
  return window.location.hostname.endsWith('github.io') && !window.SPENDWISE_API_BASE;
}

function respond(status, payload) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload
  };
}

function fail(status, message) {
  return respond(status, { success: false, message });
}

function nowIso() {
  return new Date().toISOString();
}

function newId() {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return window.crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function hashPassword(password) {
  const input = `spendwise::${password}`;
  if (window.crypto && window.crypto.subtle) {
    const digest = await window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
    return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv-${(hash >>> 0).toString(16)}`;
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    currency: user.currency,
    createdAt: user.createdAt
  };
}

function blankAccount() {
  return { transactions: [], budgets: [], goals: [] };
}

function loadState() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.users) && parsed.accounts) return parsed;
    }
  } catch (error) {
    // Corrupted demo storage falls back to a fresh seeded state.
  }
  return { users: [], sessionUserId: null, accounts: {} };
}

function saveState(state) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    // Storage may be unavailable (private mode); the session then lasts one page view.
  }
}

let seedPromise = null;

function ensureSeeded() {
  if (!seedPromise) {
    seedPromise = (async () => {
      const state = loadState();
      if (state.users.length === 0) await seedDemoAccount(state);
      return state;
    })();
  }
  return seedPromise;
}

async function seedDemoAccount(state) {
  const now = new Date();
  const dateInMonth = (monthOffset, day, hour = 10) => {
    const date = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1, hour, 0, 0, 0);
    const maxDay = monthOffset === 0 ? Math.max(1, now.getDate()) : 28;
    date.setDate(Math.min(day, maxDay));
    if (date.getTime() > now.getTime()) date.setTime(now.getTime());
    return date.toISOString();
  };

  const user = {
    id: newId(),
    name: 'Demo User',
    email: DEMO_ACCOUNT.email,
    currency: 'INR',
    passwordHash: await hashPassword(DEMO_ACCOUNT.password),
    createdAt: nowIso()
  };

  const makeTx = (title, amount, type, category, paymentMethod, date, description = '') => ({
    _id: newId(),
    userId: user.id,
    title,
    amount,
    type,
    category,
    paymentMethod,
    date,
    description,
    createdAt: date,
    updatedAt: date
  });

  const transactions = [
    makeTx('Monthly Salary', 85000, 'income', 'Salary', 'Bank Transfer', dateInMonth(0, 1, 9), 'Monthly payroll'),
    makeTx('Apartment Rent', 18000, 'expense', 'Housing', 'Bank Transfer', dateInMonth(0, 1, 11)),
    makeTx('Electricity Bill', 2100, 'expense', 'Utilities', 'UPI', dateInMonth(0, 2, 18)),
    makeTx('Grocery Store', 2450, 'expense', 'Food & Dining', 'UPI', dateInMonth(0, 3)),
    makeTx('Metro Card Top-up', 1200, 'expense', 'Transport', 'UPI', dateInMonth(0, 4)),
    makeTx('Weekend Cinema', 1500, 'expense', 'Entertainment', 'Card', dateInMonth(0, 5)),
    makeTx('Running Shoes', 3200, 'expense', 'Shopping', 'Card', dateInMonth(0, 6)),

    makeTx('Monthly Salary', 85000, 'income', 'Salary', 'Bank Transfer', dateInMonth(-1, 1, 9)),
    makeTx('Apartment Rent', 18000, 'expense', 'Housing', 'Bank Transfer', dateInMonth(-1, 3, 11)),
    makeTx('Grocery Store', 3200, 'expense', 'Food & Dining', 'UPI', dateInMonth(-1, 8)),
    makeTx('Electricity Bill', 1900, 'expense', 'Utilities', 'UPI', dateInMonth(-1, 12)),
    makeTx('Dinner Out', 2100, 'expense', 'Food & Dining', 'Card', dateInMonth(-1, 19)),

    makeTx('Monthly Salary', 82000, 'income', 'Salary', 'Bank Transfer', dateInMonth(-2, 1, 9)),
    makeTx('Apartment Rent', 18000, 'expense', 'Housing', 'Bank Transfer', dateInMonth(-2, 3, 11)),
    makeTx('Grocery Store', 2800, 'expense', 'Food & Dining', 'UPI', dateInMonth(-2, 9)),
    makeTx('Metro Card Top-up', 900, 'expense', 'Transport', 'UPI', dateInMonth(-2, 15)),
    makeTx('Winter Jacket', 4500, 'expense', 'Shopping', 'Card', dateInMonth(-2, 21)),

    makeTx('Monthly Salary', 82000, 'income', 'Salary', 'Bank Transfer', dateInMonth(-3, 1, 9)),
    makeTx('Apartment Rent', 18000, 'expense', 'Housing', 'Bank Transfer', dateInMonth(-3, 3, 11)),
    makeTx('Grocery Store', 2600, 'expense', 'Food & Dining', 'UPI', dateInMonth(-3, 10)),
    makeTx('Concert Tickets', 1800, 'expense', 'Entertainment', 'Card', dateInMonth(-3, 17)),
    makeTx('Pharmacy', 1200, 'expense', 'Healthcare', 'UPI', dateInMonth(-3, 24)),

    makeTx('Monthly Salary', 80000, 'income', 'Salary', 'Bank Transfer', dateInMonth(-4, 1, 9)),
    makeTx('Apartment Rent', 18000, 'expense', 'Housing', 'Bank Transfer', dateInMonth(-4, 3, 11)),
    makeTx('Grocery Store', 3000, 'expense', 'Food & Dining', 'UPI', dateInMonth(-4, 11))
  ];

  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const makeBudget = (category, amount) => {
    const createdAt = nowIso();
    return {
      _id: newId(),
      userId: user.id,
      month,
      year,
      category,
      amount,
      createdAt,
      updatedAt: createdAt
    };
  };

  const nextYear = new Date(now.getFullYear() + 1, now.getMonth(), 1).toISOString();
  const makeGoal = (title, targetAmount, currentAmount) => ({
    _id: newId(),
    userId: user.id,
    title,
    targetAmount,
    currentAmount,
    targetDate: nextYear,
    createdAt: nowIso(),
    updatedAt: nowIso()
  });

  state.users.push(user);
  state.accounts[user.id] = {
    transactions,
    budgets: [makeBudget('Overall', 40000), makeBudget('Food & Dining', 5000), makeBudget('Housing', 20000)],
    goals: [makeGoal('Emergency Fund', 200000, 60000), makeGoal('Vacation Fund', 150000, 45000)]
  };
  saveState(state);
}

function parseBody(raw) {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (error) {
    return {};
  }
}

function withinRange(value, start, end) {
  const time = new Date(value).getTime();
  return time >= start.getTime() && time <= end.getTime();
}

function periodBoundaries(period = '1M') {
  const now = new Date();
  let currentStart;
  let currentEnd = new Date(now);
  let previousStart;
  let previousEnd;

  switch (String(period).toUpperCase()) {
    case '1W': {
      currentStart = new Date(now);
      currentStart.setDate(now.getDate() - 7);
      currentStart.setHours(0, 0, 0, 0);
      previousEnd = new Date(currentStart);
      previousStart = new Date(previousEnd);
      previousStart.setDate(previousEnd.getDate() - 7);
      break;
    }
    case '3M': {
      currentStart = new Date(now);
      currentStart.setMonth(now.getMonth() - 3);
      currentStart.setHours(0, 0, 0, 0);
      previousEnd = new Date(currentStart);
      previousStart = new Date(previousEnd);
      previousStart.setMonth(previousEnd.getMonth() - 3);
      break;
    }
    case '1Y': {
      currentStart = new Date(now);
      currentStart.setFullYear(now.getFullYear() - 1);
      currentStart.setHours(0, 0, 0, 0);
      previousEnd = new Date(currentStart);
      previousStart = new Date(previousEnd);
      previousStart.setFullYear(previousEnd.getFullYear() - 1);
      break;
    }
    case '1M':
    default: {
      currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
      previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      previousEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      break;
    }
  }

  return { currentStart, currentEnd, previousStart, previousEnd };
}

function sumByType(transactions) {
  const totals = { income: 0, expense: 0 };
  transactions.forEach((tx) => {
    if (tx.type === 'income' || tx.type === 'expense') totals[tx.type] += tx.amount;
  });
  return totals;
}

function listTransactions(account, query) {
  const search = (query.get('search') || '').trim().toLowerCase();
  const type = query.get('type') || '';
  const category = (query.get('category') || '').trim();
  const startDate = query.get('startDate');
  const endDate = query.get('endDate');
  const sortBy = query.get('sortBy') || 'date_desc';
  const page = Math.max(1, parseInt(query.get('page'), 10) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(query.get('limit'), 10) || 20));

  let items = account.transactions.slice();

  if (search) {
    items = items.filter(
      (tx) =>
        (tx.title || '').toLowerCase().includes(search) ||
        (tx.description || '').toLowerCase().includes(search)
    );
  }
  if (type === 'income' || type === 'expense') items = items.filter((tx) => tx.type === type);
  if (category) items = items.filter((tx) => tx.category === category);

  if (startDate || endDate) {
    const start = startDate ? new Date(startDate).getTime() : -Infinity;
    const end = endDate ? new Date(`${endDate}T23:59:59.999`).getTime() : Infinity;
    items = items.filter((tx) => {
      const time = new Date(tx.date).getTime();
      return time >= start && time <= end;
    });
  }

  items.sort((a, b) => {
    const dateDiff = new Date(a.date).getTime() - new Date(b.date).getTime();
    if (sortBy === 'date_asc') return dateDiff || String(a._id).localeCompare(String(b._id));
    if (sortBy === 'amount_asc') return a.amount - b.amount || dateDiff * -1;
    if (sortBy === 'amount_desc') return b.amount - a.amount || dateDiff * -1;
    return dateDiff * -1 || String(b._id).localeCompare(String(a._id));
  });

  const total = items.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const data = items.slice((page - 1) * limit, page * limit);

  return respond(200, {
    success: true,
    data,
    pagination: { total, page, limit, totalPages }
  });
}

function createTransaction(state, account, user, body) {
  const title = (body.title || '').trim();
  const amount = parseFloat(body.amount);
  const type = body.type;
  const category = (body.category || '').trim();

  if (!title) return fail(400, 'Transaction title is required.');
  if (isNaN(amount) || amount <= 0) return fail(400, 'Amount must be a positive number.');
  if (!['income', 'expense'].includes(type)) return fail(400, 'Type must be either "income" or "expense".');
  if (!category) return fail(400, 'Category is required.');

  const timestamp = nowIso();
  const transaction = {
    _id: newId(),
    userId: user.id,
    title,
    amount,
    type,
    category,
    paymentMethod: (body.paymentMethod || '').trim() || 'Cash',
    date: body.date ? new Date(body.date).toISOString() : timestamp,
    description: body.description ? String(body.description).trim() : '',
    createdAt: timestamp,
    updatedAt: timestamp
  };

  account.transactions.push(transaction);
  saveState(state);
  return respond(201, {
    success: true,
    message: 'Transaction created successfully.',
    data: transaction
  });
}

function updateTransaction(state, account, body, id) {
  const transaction = account.transactions.find((tx) => tx._id === id);
  if (!transaction) return fail(404, 'Transaction not found.');

  if (body.title !== undefined && String(body.title).trim()) transaction.title = String(body.title).trim();
  if (body.amount !== undefined) {
    const amount = parseFloat(body.amount);
    if (isNaN(amount) || amount <= 0) return fail(400, 'Amount must be a positive number.');
    transaction.amount = amount;
  }
  if (body.type !== undefined) {
    if (!['income', 'expense'].includes(body.type)) return fail(400, 'Type must be either "income" or "expense".');
    transaction.type = body.type;
  }
  if (body.category !== undefined && String(body.category).trim()) transaction.category = String(body.category).trim();
  if (body.paymentMethod !== undefined) transaction.paymentMethod = String(body.paymentMethod).trim() || 'Cash';
  if (body.date) transaction.date = new Date(body.date).toISOString();
  if (body.description !== undefined) transaction.description = String(body.description).trim();
  transaction.updatedAt = nowIso();

  saveState(state);
  return respond(200, {
    success: true,
    message: 'Transaction updated successfully.',
    data: transaction
  });
}

function enrichBudgets(account, month, year) {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);

  const spendingMap = {};
  let totalMonthlyExpenses = 0;
  account.transactions.forEach((tx) => {
    if (tx.type !== 'expense' || !withinRange(tx.date, start, end)) return;
    spendingMap[tx.category] = (spendingMap[tx.category] || 0) + tx.amount;
    totalMonthlyExpenses += tx.amount;
  });

  const budgets = account.budgets
    .filter((budget) => budget.month === month && budget.year === year)
    .map((budget) => {
      const spent = budget.category === 'Overall' ? totalMonthlyExpenses : spendingMap[budget.category] || 0;
      return {
        ...budget,
        spent,
        remaining: Math.max(0, budget.amount - spent),
        percentage: budget.amount > 0 ? Math.round((spent / budget.amount) * 100) : 0,
        isExceeded: spent > budget.amount
      };
    });

  return { budgets, totalMonthlyExpenses };
}

function saveBudget(state, account, user, body) {
  const month = parseInt(body.month, 10);
  const year = parseInt(body.year, 10);
  const category = (body.category || '').trim();
  const amount = parseFloat(body.amount);

  if (!month || month < 1 || month > 12) return fail(400, 'Valid month (1-12) is required.');
  if (!year || year < 2000) return fail(400, 'Valid year is required.');
  if (!category) return fail(400, 'Category is required (e.g. "Overall", "Food & Dining").');
  if (isNaN(amount) || amount < 0) return fail(400, 'Amount must be 0 or greater.');

  let budget = account.budgets.find(
    (item) => item.month === month && item.year === year && item.category === category
  );

  if (budget) {
    budget.amount = amount;
    budget.updatedAt = nowIso();
  } else {
    const timestamp = nowIso();
    budget = {
      _id: newId(),
      userId: user.id,
      month,
      year,
      category,
      amount,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    account.budgets.push(budget);
  }

  saveState(state);
  return respond(201, {
    success: true,
    message: 'Budget saved successfully.',
    data: budget
  });
}

function updateBudget(state, account, body, id) {
  const budget = account.budgets.find((item) => item._id === id);
  if (!budget) return fail(404, 'Budget not found.');

  if (body.amount !== undefined) {
    const amount = parseFloat(body.amount);
    if (isNaN(amount) || amount < 0) return fail(400, 'Amount must be a valid positive number.');
    budget.amount = amount;
  }
  if (body.category !== undefined && String(body.category).trim()) budget.category = String(body.category).trim();
  budget.updatedAt = nowIso();

  saveState(state);
  return respond(200, {
    success: true,
    message: 'Budget updated successfully.',
    data: budget
  });
}

function createGoal(state, account, user, body) {
  const title = (body.title || '').trim();
  const targetAmount = parseFloat(body.targetAmount);
  const currentAmount = body.currentAmount !== undefined ? parseFloat(body.currentAmount) : 0;

  if (!title) return fail(400, 'Goal title is required.');
  if (isNaN(targetAmount) || targetAmount <= 0) return fail(400, 'Target amount must be a number greater than 0.');
  if (isNaN(currentAmount) || currentAmount < 0) return fail(400, 'Current amount cannot be negative.');

  const timestamp = nowIso();
  const goal = {
    _id: newId(),
    userId: user.id,
    title,
    targetAmount,
    currentAmount,
    targetDate: body.targetDate ? new Date(body.targetDate).toISOString() : undefined,
    createdAt: timestamp,
    updatedAt: timestamp
  };

  account.goals.push(goal);
  saveState(state);
  return respond(201, {
    success: true,
    message: 'Savings goal created successfully.',
    data: goal
  });
}

function updateGoal(state, account, body, id) {
  const goal = account.goals.find((item) => item._id === id);
  if (!goal) return fail(404, 'Savings goal not found.');

  if (body.title !== undefined && String(body.title).trim()) goal.title = String(body.title).trim();

  if (body.targetAmount !== undefined) {
    const target = parseFloat(body.targetAmount);
    if (isNaN(target) || target <= 0) return fail(400, 'Target amount must be greater than 0.');
    goal.targetAmount = target;
  }

  if (body.depositAmount !== undefined) {
    const deposit = parseFloat(body.depositAmount);
    if (isNaN(deposit)) return fail(400, 'Invalid deposit amount.');
    goal.currentAmount = Math.max(0, goal.currentAmount + deposit);
  } else if (body.currentAmount !== undefined) {
    const current = parseFloat(body.currentAmount);
    if (isNaN(current) || current < 0) return fail(400, 'Current amount cannot be negative.');
    goal.currentAmount = current;
  }

  if (body.targetDate !== undefined) {
    goal.targetDate = body.targetDate ? new Date(body.targetDate).toISOString() : undefined;
  }
  goal.updatedAt = nowIso();

  saveState(state);
  return respond(200, {
    success: true,
    message: 'Savings goal updated successfully.',
    data: goal
  });
}

function dashboardSummary(account, user, period) {
  const { currentStart, currentEnd, previousStart, previousEnd } = periodBoundaries(period);

  const allTime = sumByType(account.transactions);
  const current = sumByType(
    account.transactions.filter((tx) => withinRange(tx.date, currentStart, currentEnd))
  );
  const previous = sumByType(
    account.transactions.filter((tx) => withinRange(tx.date, previousStart, previousEnd))
  );

  const change = (curr, prev) => {
    if (!prev) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  };

  const incomeChange = change(current.income, previous.income);
  const expenseChange = change(current.expense, previous.expense);
  const net = current.income - current.expense;
  const savingsRate = current.income > 0 ? Math.round((net / current.income) * 100) : 0;

  return respond(200, {
    success: true,
    period,
    currency: user.currency || 'INR',
    userName: user.name || 'User',
    metrics: {
      netCashBalance: { value: allTime.income - allTime.expense, label: 'Available Balance' },
      monthlyIncome: {
        value: current.income,
        changePercent: incomeChange,
        isPositive: incomeChange >= 0,
        label: 'Total Income'
      },
      totalSpent: {
        value: current.expense,
        changePercent: expenseChange,
        isPositive: expenseChange <= 0,
        label: 'Total Spent'
      },
      savingsRate: { value: savingsRate, isPositive: savingsRate >= 0, label: 'Savings Rate' }
    }
  });
}

function dashboardCashflow(account, period) {
  const { currentStart, currentEnd } = periodBoundaries(period);
  const transactions = account.transactions
    .filter((tx) => withinRange(tx.date, currentStart, currentEnd))
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const labels = [];
  const incomeMap = {};
  const expenseMap = {};
  const upperPeriod = String(period).toUpperCase();

  if (upperPeriod === '1W') {
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const label = date.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' });
      labels.push(label);
      incomeMap[label] = 0;
      expenseMap[label] = 0;
    }
    transactions.forEach((tx) => {
      const label = new Date(tx.date).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'numeric',
        day: 'numeric'
      });
      if (incomeMap[label] === undefined) return;
      if (tx.type === 'income') incomeMap[label] += tx.amount;
      if (tx.type === 'expense') expenseMap[label] += tx.amount;
    });
  } else if (upperPeriod === '1Y') {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const label = `${monthNames[date.getMonth()]} ${date.getFullYear().toString().slice(-2)}`;
      labels.push(label);
      incomeMap[label] = 0;
      expenseMap[label] = 0;
    }
    transactions.forEach((tx) => {
      const date = new Date(tx.date);
      const label = `${monthNames[date.getMonth()]} ${date.getFullYear().toString().slice(-2)}`;
      if (incomeMap[label] === undefined) return;
      if (tx.type === 'income') incomeMap[label] += tx.amount;
      if (tx.type === 'expense') expenseMap[label] += tx.amount;
    });
  } else {
    const bucketCount = upperPeriod === '3M' ? 12 : 4;
    for (let i = 1; i <= bucketCount; i++) {
      const label = `Week ${i}`;
      labels.push(label);
      incomeMap[label] = 0;
      expenseMap[label] = 0;
    }
    const span = currentEnd.getTime() - currentStart.getTime();
    const bucketDuration = span / bucketCount;
    transactions.forEach((tx) => {
      const offset = new Date(tx.date).getTime() - currentStart.getTime();
      let bucket = Math.floor(offset / bucketDuration);
      if (bucket >= bucketCount) bucket = bucketCount - 1;
      if (bucket < 0) bucket = 0;
      const label = `Week ${bucket + 1}`;
      if (tx.type === 'income') incomeMap[label] += tx.amount;
      if (tx.type === 'expense') expenseMap[label] += tx.amount;
    });
  }

  const incomeData = labels.map((label) => incomeMap[label] || 0);
  const expenseData = labels.map((label) => expenseMap[label] || 0);
  const totalIncome = incomeData.reduce((sum, value) => sum + value, 0);
  const totalExpense = expenseData.reduce((sum, value) => sum + value, 0);

  return respond(200, {
    success: true,
    period,
    chartData: {
      labels,
      datasets: [
        {
          label: 'Income',
          data: incomeData,
          borderColor: '#2EE6A8',
          backgroundColor: 'rgba(46, 230, 168, 0.12)'
        },
        {
          label: 'Expense',
          data: expenseData,
          borderColor: '#FF6B81',
          backgroundColor: 'rgba(255, 107, 129, 0.12)'
        }
      ]
    },
    summary: { totalIncome, totalExpense, netCashflow: totalIncome - totalExpense }
  });
}

function dashboardSpending(account, period) {
  const { currentStart, currentEnd } = periodBoundaries(period);
  const byCategory = {};
  let totalSpending = 0;

  account.transactions.forEach((tx) => {
    if (tx.type !== 'expense' || !withinRange(tx.date, currentStart, currentEnd)) return;
    byCategory[tx.category] = byCategory[tx.category] || { amount: 0, count: 0 };
    byCategory[tx.category].amount += tx.amount;
    byCategory[tx.category].count += 1;
    totalSpending += tx.amount;
  });

  const categories = Object.keys(byCategory)
    .map((category) => ({
      category,
      amount: byCategory[category].amount,
      count: byCategory[category].count,
      percentage: totalSpending > 0 ? Math.round((byCategory[category].amount / totalSpending) * 100) : 0,
      color: CATEGORY_COLORS[category] || '#A0A0B8'
    }))
    .sort((a, b) => b.amount - a.amount);

  return respond(200, {
    success: true,
    period,
    totalSpending,
    categories,
    chartData: {
      labels: categories.map((item) => item.category),
      datasets: [
        {
          data: categories.map((item) => item.amount),
          backgroundColor: categories.map((item) => item.color),
          borderWidth: 2,
          borderColor: '#0E1626'
        }
      ]
    }
  });
}

function analyticsOverview(account, timeframe) {
  const now = new Date();
  const months = 6;
  const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);

  const totals = sumByType(account.transactions);
  const netSavings = totals.income - totals.expense;
  const savingsRate = totals.income > 0 ? Math.round((netSavings / totals.income) * 100) : 0;

  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const labels = [];
  const income = [];
  const expenses = [];

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    labels.push(`${monthNames[month - 1]} ${year.toString().slice(-2)}`);

    const monthTx = account.transactions.filter((tx) => {
      const value = new Date(tx.date);
      return value.getFullYear() === year && value.getMonth() + 1 === month;
    });
    const monthTotals = sumByType(monthTx);
    income.push(monthTotals.income);
    expenses.push(monthTotals.expense);
  }

  const categoryTotals = {};
  account.transactions.forEach((tx) => {
    if (tx.type !== 'expense') return;
    categoryTotals[tx.category] = (categoryTotals[tx.category] || 0) + tx.amount;
  });
  const top = Object.keys(categoryTotals).sort((a, b) => categoryTotals[b] - categoryTotals[a])[0];

  return respond(200, {
    success: true,
    timeframe,
    summary: {
      totalIncome: totals.income,
      totalExpense: totals.expense,
      netSavings,
      savingsRate,
      totalTransactions: account.transactions.length,
      highestSpendingCategory: top
        ? {
            name: top,
            amount: categoryTotals[top],
            percentage: totals.expense > 0 ? Math.round((categoryTotals[top] / totals.expense) * 100) : 0
          }
        : null
    },
    monthlyTrends: { labels, income, expenses }
  });
}

function analyticsCategories(account) {
  const byCategory = {};
  let totalExpense = 0;

  account.transactions.forEach((tx) => {
    if (tx.type !== 'expense') return;
    byCategory[tx.category] = byCategory[tx.category] || { total: 0, count: 0, max: 0 };
    byCategory[tx.category].total += tx.amount;
    byCategory[tx.category].count += 1;
    byCategory[tx.category].max = Math.max(byCategory[tx.category].max, tx.amount);
    totalExpense += tx.amount;
  });

  const categories = Object.keys(byCategory)
    .map((category) => ({
      category,
      totalAmount: byCategory[category].total,
      count: byCategory[category].count,
      avgAmount: Math.round(byCategory[category].total / byCategory[category].count),
      maxAmount: byCategory[category].max,
      percentage: totalExpense > 0 ? Math.round((byCategory[category].total / totalExpense) * 100) : 0,
      color: CATEGORY_COLORS[category] || '#A0A0B8'
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount);

  return respond(200, { success: true, totalExpense, categories });
}

async function signup(state, body) {
  const name = (body.name || '').trim();
  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';
  const confirmPassword = body.confirmPassword;

  if (!name || !email || !password) return fail(400, 'Name, email, and password are required.');
  if (confirmPassword && password !== confirmPassword) return fail(400, 'Passwords do not match.');
  if (password.length < 6) return fail(400, 'Password must be at least 6 characters long.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail(400, 'Please enter a valid email address.');
  if (state.users.some((user) => user.email === email)) {
    return fail(409, 'An account with this email already exists.');
  }

  const user = {
    id: newId(),
    name,
    email,
    currency: body.currency || 'INR',
    passwordHash: await hashPassword(password),
    createdAt: nowIso()
  };

  state.users.push(user);
  state.accounts[user.id] = blankAccount();
  state.sessionUserId = user.id;
  saveState(state);

  return respond(201, {
    success: true,
    message: 'Account created successfully.',
    user: publicUser(user)
  });
}

async function login(state, body) {
  const email = (body.email || '').trim().toLowerCase();
  const password = body.password || '';

  if (!email || !password) return fail(400, 'Email and password are required.');

  const user = state.users.find((item) => item.email === email);
  if (!user) return fail(401, 'Invalid email or password.');
  if ((await hashPassword(password)) !== user.passwordHash) return fail(401, 'Invalid email or password.');

  state.sessionUserId = user.id;
  saveState(state);

  return respond(200, {
    success: true,
    message: 'Logged in successfully.',
    user: publicUser(user)
  });
}

export async function demoRequest(endpoint, options = {}) {
  const method = String(options.method || 'GET').toUpperCase();
  const [rawPath, rawQuery = ''] = String(endpoint).split('?');
  const path = rawPath.replace(/\/+$/, '') || '/';
  const query = new URLSearchParams(rawQuery);
  const body = parseBody(options.body);

  await ensureSeeded();
  const state = loadState();

  if (path === '/auth/signup' && method === 'POST') return signup(state, body);
  if (path === '/auth/login' && method === 'POST') return login(state, body);

  if (path === '/auth/logout' && method === 'POST') {
    state.sessionUserId = null;
    saveState(state);
    return respond(200, { success: true, message: 'Logged out successfully.' });
  }

  const user = state.users.find((item) => item.id === state.sessionUserId);
  if (!user) return fail(401, 'Not authenticated. Please log in.');

  if (!state.accounts[user.id]) state.accounts[user.id] = blankAccount();
  const account = state.accounts[user.id];

  if (path === '/auth/me' && method === 'GET') {
    return respond(200, { success: true, user: publicUser(user) });
  }

  if (path === '/profile' && method === 'PUT') {
    if (body.name !== undefined && String(body.name).trim()) user.name = String(body.name).trim();
    if (body.currency !== undefined && String(body.currency).trim()) user.currency = String(body.currency).trim();
    saveState(state);
    return respond(200, {
      success: true,
      message: 'Profile updated successfully.',
      user: publicUser(user)
    });
  }

  if (path === '/profile/password' && method === 'PUT') {
    const currentPassword = body.currentPassword || '';
    const newPassword = body.newPassword || '';
    if (!currentPassword || !newPassword) {
      return fail(400, 'Current password and new password are required.');
    }
    if (newPassword.length < 6) return fail(400, 'New password must be at least 6 characters long.');
    if ((await hashPassword(currentPassword)) !== user.passwordHash) {
      return fail(400, 'Current password is incorrect.');
    }
    user.passwordHash = await hashPassword(newPassword);
    saveState(state);
    return respond(200, { success: true, message: 'Password changed successfully.' });
  }

  if (path === '/transactions') {
    if (method === 'GET') return listTransactions(account, query);
    if (method === 'POST') return createTransaction(state, account, user, body);
  }

  const transactionMatch = path.match(/^\/transactions\/([^/]+)$/);
  if (transactionMatch) {
    const id = transactionMatch[1];
    if (method === 'GET') {
      const transaction = account.transactions.find((tx) => tx._id === id);
      return transaction ? respond(200, { success: true, data: transaction }) : fail(404, 'Transaction not found.');
    }
    if (method === 'PUT') return updateTransaction(state, account, body, id);
    if (method === 'DELETE') {
      const index = account.transactions.findIndex((tx) => tx._id === id);
      if (index === -1) return fail(404, 'Transaction not found.');
      account.transactions.splice(index, 1);
      saveState(state);
      return respond(200, {
        success: true,
        message: 'Transaction deleted successfully.',
        data: { id }
      });
    }
  }

  if (path === '/budgets') {
    if (method === 'GET') {
      const now = new Date();
      const month = parseInt(query.get('month'), 10) || now.getMonth() + 1;
      const year = parseInt(query.get('year'), 10) || now.getFullYear();
      const { budgets, totalMonthlyExpenses } = enrichBudgets(account, month, year);
      return respond(200, {
        success: true,
        month,
        year,
        totalExpensesInMonth: totalMonthlyExpenses,
        data: budgets
      });
    }
    if (method === 'POST') return saveBudget(state, account, user, body);
  }

  const budgetMatch = path.match(/^\/budgets\/([^/]+)$/);
  if (budgetMatch) {
    const id = budgetMatch[1];
    if (method === 'PUT') return updateBudget(state, account, body, id);
    if (method === 'DELETE') {
      const index = account.budgets.findIndex((budget) => budget._id === id);
      if (index === -1) return fail(404, 'Budget not found.');
      account.budgets.splice(index, 1);
      saveState(state);
      return respond(200, { success: true, message: 'Budget deleted successfully.', data: { id } });
    }
  }

  if (path === '/goals') {
    if (method === 'GET') {
      const goals = account.goals
        .slice()
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return respond(200, { success: true, data: goals });
    }
    if (method === 'POST') return createGoal(state, account, user, body);
  }

  const goalMatch = path.match(/^\/goals\/([^/]+)$/);
  if (goalMatch) {
    const id = goalMatch[1];
    if (method === 'PUT') return updateGoal(state, account, body, id);
    if (method === 'DELETE') {
      const index = account.goals.findIndex((goal) => goal._id === id);
      if (index === -1) return fail(404, 'Savings goal not found.');
      account.goals.splice(index, 1);
      saveState(state);
      return respond(200, { success: true, message: 'Savings goal deleted successfully.', data: { id } });
    }
  }

  if (path === '/dashboard/summary' && method === 'GET') {
    return dashboardSummary(account, user, query.get('period') || '1M');
  }
  if (path === '/dashboard/cashflow' && method === 'GET') {
    return dashboardCashflow(account, query.get('period') || '1M');
  }
  if (path === '/dashboard/spending' && method === 'GET') {
    return dashboardSpending(account, query.get('period') || '1M');
  }

  if (path === '/analytics/overview' && method === 'GET') {
    return analyticsOverview(account, query.get('timeframe') || 'monthly');
  }
  if (path === '/analytics/categories' && method === 'GET') {
    return analyticsCategories(account);
  }

  return fail(404, 'Endpoint not found in demo mode.');
}
