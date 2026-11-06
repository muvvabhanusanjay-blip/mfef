import { api, formatCurrency } from './api.js';

let currentUser = null;
let trendChartInstance = null;
let categoryChartInstance = null;

const CATEGORY_ICONS = {
  'Food & Dining': '🍔',
  'Housing': '🏠',
  'Transport': '🚗',
  'Entertainment': '🎬',
  'Shopping': '🛍️',
  'Healthcare': '💊',
  'Utilities': '⚡',
  'Salary': '💰',
  'Investment': '📈',
  'Other': '💳'
};

document.addEventListener('DOMContentLoaded', async () => {
  try {
    await initAuth();
    setupSidebar();
    await loadAnalyticsData();
  } catch (err) {
    console.error('[Analytics Init Error]:', err);
  }
});

async function initAuth() {
  try {
    const res = await api.auth.getMe();
    currentUser = res.user;

    const avatarEl = document.getElementById('user-avatar');
    const snippetEl = document.getElementById('user-name-snippet');
    if (avatarEl) {
      const initials = currentUser.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
      avatarEl.textContent = initials || 'U';
    }
    if (snippetEl) snippetEl.textContent = currentUser.name;

    document.getElementById('logout-btn')?.addEventListener('click', async () => {
      await api.auth.logout();
      window.location.href = 'login.html';
    });
  } catch (err) {
    window.location.href = 'login.html';
  }
}

function setupSidebar() {
  const hamburgerBtn = document.getElementById('hamburger-btn');
  const closeBtn = document.getElementById('sidebar-close');
  const sidebar = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebar-backdrop');

  const toggle = (open) => {
    sidebar.classList.toggle('mobile-open', open);
    backdrop.classList.toggle('mobile-open', open);
  };

  if (hamburgerBtn) hamburgerBtn.addEventListener('click', () => toggle(true));
  if (closeBtn) closeBtn.addEventListener('click', () => toggle(false));
  if (backdrop) backdrop.addEventListener('click', () => toggle(false));
}

async function loadAnalyticsData() {
  try {
    const [overviewRes, categoryRes] = await Promise.all([
      api.analytics.getOverview(),
      api.analytics.getCategories()
    ]);

    const cur = currentUser?.currency || 'INR';
    const { summary, monthlyTrends } = overviewRes;

    // 1. Populate top metric cards
    document.getElementById('stat-all-income').textContent = formatCurrency(summary.totalIncome, cur);
    document.getElementById('stat-all-expense').textContent = formatCurrency(summary.totalExpense, cur);
    document.getElementById('stat-net-savings').textContent = formatCurrency(summary.netSavings, cur);
    document.getElementById('stat-savings-rate').textContent = `${summary.savingsRate}%`;

    if (summary.highestSpendingCategory) {
      document.getElementById('top-cat-name').textContent = `${summary.highestSpendingCategory.name} (${formatCurrency(summary.highestSpendingCategory.amount, cur)} • ${summary.highestSpendingCategory.percentage}%)`;
    }

    // 2. Render Monthly Trends Bar Chart
    renderMonthlyChart(monthlyTrends, cur);

    // 3. Render Category Doughnut Chart
    renderCategoryDoughnut(categoryRes.categories, cur);

    // 4. Populate Categories Table
    renderCategoriesTable(categoryRes.categories, cur);
  } catch (err) {
    console.error('[Load Analytics Error]:', err);
  }
}

function renderMonthlyChart(trends, cur) {
  const ctx = document.getElementById('monthlyTrendChart');
  if (!ctx) return;

  if (trendChartInstance) trendChartInstance.destroy();

  trendChartInstance = new Chart(ctx.getContext('2d'), {
    type: 'bar',
    data: {
      labels: trends.labels,
      datasets: [
        {
          label: 'Income',
          data: trends.income,
          backgroundColor: '#2EE6A8',
          borderRadius: 6,
          barPercentage: 0.6
        },
        {
          label: 'Expense',
          data: trends.expenses,
          backgroundColor: '#FF6B81',
          borderRadius: 6,
          barPercentage: 0.6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { color: '#F3F7FF', font: { family: "'Inter', sans-serif" } }
        },
        tooltip: {
          backgroundColor: '#141F33',
          borderColor: 'rgba(148, 163, 184, 0.2)',
          borderWidth: 1,
          titleColor: '#F3F7FF',
          bodyColor: '#A3B0C6',
          callbacks: {
            label: (ctx) => ` ${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y, cur)}`
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(148, 163, 184, 0.07)' },
          ticks: { color: '#A3B0C6' }
        },
        y: {
          grid: { color: 'rgba(148, 163, 184, 0.07)' },
          ticks: { color: '#A3B0C6', callback: (v) => formatCurrency(v, cur) }
        }
      }
    }
  });
}

function renderCategoryDoughnut(categories, cur) {
  const ctx = document.getElementById('categoryDoughnutChart');
  if (!ctx) return;

  if (categoryChartInstance) categoryChartInstance.destroy();

  categoryChartInstance = new Chart(ctx.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels: categories.map((c) => c.category),
      datasets: [
        {
          data: categories.map((c) => c.totalAmount),
          backgroundColor: categories.map((c) => c.color),
          borderColor: '#0E1626',
          borderWidth: 3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '70%',
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#141F33',
          borderColor: 'rgba(148, 163, 184, 0.2)',
          borderWidth: 1,
          titleColor: '#F3F7FF',
          bodyColor: '#A3B0C6',
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ${formatCurrency(ctx.parsed, cur)}`
          }
        }
      }
    }
  });
}

function renderCategoriesTable(categories, cur) {
  const tbody = document.getElementById('categories-table-body');
  if (!tbody) return;

  if (!categories || categories.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 28px; color: var(--text-secondary);">No expense transactions found</td></tr>`;
    return;
  }

  tbody.innerHTML = categories
    .map((c) => {
      const icon = CATEGORY_ICONS[c.category] || '💳';
      return `
      <tr>
        <td>
          <div style="display: flex; align-items: center; gap: 10px; font-weight: 600;">
            <span style="font-size: 1.1rem;">${icon}</span>
            <span>${c.category}</span>
          </div>
        </td>
        <td style="font-weight: 700;">${formatCurrency(c.totalAmount, cur)}</td>
        <td>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-weight: 600; min-width: 32px;">${c.percentage}%</span>
            <div class="progress-track" style="width: 80px; height: 6px;">
              <div class="progress-bar" style="width: ${c.percentage}%; background: ${c.color};"></div>
            </div>
          </div>
        </td>
        <td><span class="badge badge-outline">${c.count} transaction${c.count === 1 ? '' : 's'}</span></td>
        <td>${formatCurrency(c.avgAmount, cur)}</td>
        <td>${formatCurrency(c.maxAmount, cur)}</td>
      </tr>
    `;
    })
    .join('');
}
