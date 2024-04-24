import { startLink } from "./link.js";
import {
  createNewUser,
  refreshSignInStatus,
  signIn,
  signOut,
} from "./signin.js";
import {
  callMyServer,
  currencyAmount,
  humanReadableCategory,
  showSelector,
} from "./utils.js";

export const refreshConnectedBanks = async () => {
  const banksMsg = document.querySelector("#banksMsg");
  const bankData = await callMyServer("/server/banks/list");
  if (bankData == null || bankData.length === 0) {
    banksMsg.textContent = "You aren't connected to any banks yet. 🙁";
  } else if (bankData.length === 1) {
    banksMsg.textContent = `You're connected to ${
      bankData[0].bank_name ?? "unknown"
    }`;
  } else {
    banksMsg.textContent =
      `You're connected to ` +
      bankData
        .map((e, idx) => {
          return (
            (idx == bankData.length - 1 && bankData.length > 1 ? "and " : "") +
            (e.bank_name ?? "(Unknown)")
          );
        })
        .join(bankData.length !== 2 ? ", " : " ");
  }
  document.querySelector("#connectToBank").textContent =
    bankData != null && bankData.length > 0
      ? "Connect another bank!"
      : "Connect a bank!";

  const bankOptions = bankData.map(
    (bank) => `<option value=${bank.id}>${bank.bank_name}</option>`
  );
  
};

const showTransactionData = (txnData) => {
  const tableRows = txnData.map((txnObj) => {
    return `<tr>
    <td>${txnObj.date}</td>
    <td>${txnObj.name}</td>
    <td>${txnObj.category}</td>
    <td class="text-end">${txnObj.amount}</td>
    <td>${txnObj.bank_name}<br/>${txnObj.account_name}</td>
    <td><input type="checkbox" class="star-checkbox" data-id="${txnObj.id}" ${
      txnObj.is_starred ? "checked" : ""
    }></td>
    </tr>`;
  });
  document.querySelector("#transactionTable").innerHTML = tableRows.join("\n");
};

const connectToBank = async () => { 
  await startLink(() => {
    refreshConnectedBanks();
  });
};

export const clientRefresh = async () => {
  // Fetch my transactions from the database
  const txnData = await callMyServer("/server/transactions/list?maxCount=50");
  showTransactionData(txnData);
};

const serverRefresh = async () => {
  // Tell my server to fetch new transactions
  await callMyServer("/server/transactions/sync", true);
};




const setMonthlyBudget = async () => {
  const budgetInput = document.getElementById('budget');
  const budgetAmount = parseFloat(budgetInput.value);

  if (isNaN(budgetAmount) || budgetAmount < 0) {
    alert("Budget is invalid");
    return; 
  }

  const response = await callMyServer("/server/users/budget", true, {
    budget: budgetAmount
  });

  getBudget();
  getMonthlySpending();
}
document.getElementById('setMonthlyBudget').addEventListener('click', setMonthlyBudget);

const getBudget = async () => {
  try{
    const response = await callMyServer("/server/users/getBudget");
    document.querySelector("#monthlyBudgetDisplay").textContent = `My Monthly Budget: $${parseFloat(response.budget).toFixed(2)}`;
  
  }catch (error) {
    console.error("Error retrieving budget:", error);
    alert("Failed to retrieve the budget. Please check the console for more details.");
  }
}

const getMonthlySpending = async () => {
    const response = await callMyServer("/server/users/getMonthlySpending");
    document.querySelector("#monthlySpendingDisplay").textContent = `My Spending this Month: $${parseFloat(response.total_spending).toFixed(2)}`;
}

const todaySpendingSummary = async () => {
  const response = await callMyServer("/server/users/todaySpendingSummary");
  document.querySelector("#todaySpendingSummary").textContent = 
  `My Spending Today: $${parseFloat(response.today_spending).toFixed(2)}`;
}

const weekSpendingSummary = async () => {
  const response = await callMyServer("/server/users/weekSpendingSummary");
  document.querySelector("#weekSpendingSummary").textContent = 
  `My Spending this Week: $${parseFloat(response.week_spending).toFixed(2)}`;
}

const monthSpendingSummary = async () => {
  const response = await callMyServer("/server/users/monthSpendingSummary");
  document.querySelector("#monthSpendingSummary").textContent = 
  `My Spending this Month: $${parseFloat(response.month_spending).toFixed(2)}`;
}

const yearSpendingSummary = async () => {
  const response = await callMyServer("/server/users/yearSpendingSummary");
  document.querySelector("#yearSpendingSummary").textContent = 
  `My Spending this Year: $${parseFloat(response.year_spending).toFixed(2)}`;
}

const showBudgetOptions = async () => {
  document.querySelector("#budgetOptions").style.display = 'block';
  console.log("showBudgetOptions reached");
  getBudget();
  getMonthlySpending();
}

document.getElementById('spendingSummaries').addEventListener('click', function() {
  todaySpendingSummary();
  weekSpendingSummary();
  monthSpendingSummary();
  yearSpendingSummary();
});


const applyFilters = async () => {
  console.log("applyFilter reached");
  const startDate = document.getElementById('startDate').value;
  const endDate = document.getElementById('endDate').value;
  const category = document.getElementById('category').value;
  const minAmount = document.getElementById('minAmount').value;
  const maxAmount = document.getElementById('maxAmount').value;
  const starred = document.getElementById('starred').checked;

  const response = await fetch(`/server/transactions/list?startDate=${startDate}&endDate=${endDate}&category=${category}&minAmount=${minAmount}&maxAmount=${maxAmount}&starred=${starred}`);
  const transactions = await response.json();

  const tbody = document.getElementById('transactionTable');
  tbody.innerHTML = ''; 
  transactions.forEach(txn => {
    const row = tbody.insertRow();
    row.insertCell(0).textContent = txn.date;
    row.insertCell(1).textContent = txn.name;
    row.insertCell(2).textContent = txn.category;
    row.insertCell(3).textContent = txn.amount;
    row.insertCell(4).textContent = txn.account_name;
    const starCell = row.insertCell(5);
        starCell.innerHTML = 
        `<input type="checkbox" class="star-checkbox" 
        data-id="${txn.id}" ${txn.is_starred ? 'checked' : ''}>`;
  });
  attachCheckboxListeners();

}

function attachCheckboxListeners() {
  document.querySelectorAll('.star-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', function() {
          const transactionId = this.getAttribute('data-id');
          const isStarred = this.checked;
          updateStarStatus(transactionId, isStarred); 
      });
  });
}

const clearFilters = async () => {
  document.getElementById('startDate').value = '';
  document.getElementById('endDate').value = '';
  document.getElementById('category').value = '';
  document.getElementById('minAmount').value = '';
  document.getElementById('maxAmount').value = '';
  document.getElementById('starred').checked = false;
  applyFilters();
}

const updateStarStatus = async (transactionId, isStarred) => {
  await callMyServer("/server/transactions/update-star-status", true, {
    transactionId: transactionId,
    isStarred: isStarred ? 1 : 0
  });
}

const selectorsAndFunctions = {
  "#createAccount": createNewUser,
  "#signIn": signIn,
  "#signOut": signOut,
  "#connectToBank": connectToBank,
  "#serverRefresh": serverRefresh,
  "#clientRefresh": clientRefresh,
  "#applyFilters": applyFilters,
  "#clearFilters": clearFilters,
  "#budgetOptionsButton": showBudgetOptions,
};

Object.entries(selectorsAndFunctions).forEach(([sel, fun]) => {
  if (document.querySelector(sel) == null) {
    console.warn(`Hmm... couldn't find ${sel}`);
  } else {
    document.querySelector(sel)?.addEventListener("click", fun);
  }
});
await refreshSignInStatus();
