const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();
const dbWrapper = require("sqlite");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const { SimpleTransaction } = require("./simpleTransactionObject");

const databaseFile = "./database/appdata.db";
let db;

// Set up our database
const existingDatabase = fs.existsSync(databaseFile);

const createUsersTableSQL =
  "CREATE TABLE users (id TEXT PRIMARY KEY, username TEXT NOT NULL, password TEXT NOT NULL, budget INTEGER NOT_NULL DEFAULT 0)";
const createItemsTableSQL =
  "CREATE TABLE items (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, " +
  "access_token TEXT NOT NULL, transaction_cursor TEXT, bank_name TEXT, " +
  "is_active INTEGER NOT_NULL DEFAULT 1, " +
  "FOREIGN KEY(user_id) REFERENCES users(id))";
const createAccountsTableSQL =
  "CREATE TABLE accounts (id TEXT PRIMARY KEY, item_id TEXT NOT NULL, " +
  "name TEXT, FOREIGN KEY(item_id) REFERENCES items(id))";
const createTransactionsTableSQL =
  "CREATE TABLE transactions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, " +
  "account_id TEXT NOT_NULL, category TEXT, date TEXT, " +
  "authorized_date TEXT, name TEXT, amount REAL, currency_code TEXT, " +
  "is_removed INTEGER NOT_NULL DEFAULT 0, " +
  "is_starred INTEGER NOT_NULL DEFAULT 0, " +
  "FOREIGN KEY(user_id) REFERENCES users(id), " +
  "FOREIGN KEY(account_id) REFERENCES accounts(id))";

dbWrapper
  .open({ filename: databaseFile, driver: sqlite3.Database })
  .then(async (dBase) => {
    db = dBase;
    try {
      if (!existingDatabase) {
        await db.run(createUsersTableSQL);
        await db.run(createItemsTableSQL);
        await db.run(createAccountsTableSQL);
        await db.run(createTransactionsTableSQL);
      } else {
        
        const tableNames = await db.all(
          "SELECT name FROM sqlite_master WHERE type='table'"
        );
        const tableNamesToCreationSQL = {
          users: createUsersTableSQL,
          items: createItemsTableSQL,
          accounts: createAccountsTableSQL,
          transactions: createTransactionsTableSQL,
        };
        for (const [tableName, creationSQL] of Object.entries(
          tableNamesToCreationSQL
        )) {
          if (!tableNames.some((table) => table.name === tableName)) {
            console.log(`Creating ${tableName} table`);
            await db.run(creationSQL);
          }
        }
        console.log("Database is up and running!");
        sqlite3.verbose();
      }
    } catch (dbError) {
      console.error(dbError);
    }
  });

const debugExposeDb = function () {
  return db;
};

const getItemIdsForUser = async function (userId) {
  const items = await db.all(`SELECT id FROM items WHERE user_id=?`, userId);
  return items;
};

const getItemsAndAccessTokensForUser = async function (userId) {
  const items = await db.all(
    `SELECT id, access_token FROM items WHERE user_id=?`,
    userId
  );
  return items;
};

const getAccountIdsForItem = async function (itemId) {
  const accounts = await db.all(
    `SELECT id FROM accounts WHERE item_id = ?`,
    itemId
  );
  return accounts;
};

const confirmItemBelongsToUser = async function (possibleItemId, userId) {
  const result = await db.get(
    `SELECT id FROM items WHERE id = ? and user_id = ?`,
    possibleItemId,
    userId
  );
  console.log(result);
  if (result && result.id === possibleItemId) {
    return true;
  } else {
    console.warn(
      `User ${userId} claims to own item they don't: ${possibleItemId}`
    );
    return false;
  }
};

const deactivateItem = async function (itemId) {
    const updateResult = await db.run(
    `UPDATE items SET access_token = 'REVOKED', is_active = 0 WHERE id = ?`,
    itemId
  );
  return updateResult;
};

const addUser = async function (userId, username, password) {
  const hashedPassword = await bcrypt.hash(password, saltRounds); 
  const result = await db.run(
    `INSERT INTO users(id, username, password) VALUES("${userId}", "${username}", "${hashedPassword}")`
  );
  return result;
};

const deleteUser = async function(userId) {
  const result = await db.run(
    `DELETE FROM users WHERE id = ?`, userId
  );
  return result;

}

const getPasswordByUserId = async function (userId) {
  const result = await db.get(`SELECT password FROM users WHERE id=?`, userId);
  return result;
};

const getUserList = async function () {
  const result = await db.all(`SELECT id, username FROM users`);
  return result;
};

const getUserRecord = async function (userId) {
  const result = await db.get(`SELECT * FROM users WHERE id=?`, userId);
  return result;
};

const getUserByUserID = async (userId) => {
  const result = await db.get(`SELECT * FROM users WHERE id = ?`, userId);
  return result;
};

const getBankNamesForUser = async function (userId) {
  const result = await db.all(
    `SELECT id, bank_name FROM items WHERE user_id=?`,
    userId
  );
  return result;
};



const addItem = async function (itemId, userId, accessToken) {
  const result = await db.run(
    `INSERT INTO items(id, user_id, access_token) VALUES(?, ?, ?)`,
    itemId,
    userId,
    accessToken
  );
  return result;
};

const addBankNameForItem = async function (itemId, institutionName) {
  const result = await db.run(
    `UPDATE items SET bank_name=? WHERE id =?`,
    institutionName,
    itemId
  );
  return result;
};

const addAccount = async function (accountId, itemId, acctName) {
  await db.run(
    `INSERT OR IGNORE INTO accounts(id, item_id, name) VALUES(?, ?, ?)`,
    accountId,
    itemId,
    acctName
  );
};

const addBudget = async function (userId, budget){
  var result = await db.run(
    `UPDATE users SET budget = ? WHERE id = ?`, 
    [budget, userId]
  );
  return result;
}

const getBudget = async function (userId){
  var result = await db.get(
    `SELECT budget FROM users WHERE id=?`,
    userId
  );
  return result;
}

const getMonthlySpending = async function (userId) {
  var result = await db.get(
    `SELECT SUM(amount) AS total_spending FROM transactions
    WHERE date >= date('now', 'start of month') AND date <= date('now') AND amount > 0 AND user_id = ?`,
    userId
  );
  if (result && result.total_spending !== null) {
    return { total_spending: result.total_spending };
  } else {
    return { total_spending: 0 };
  }
}

const todaySpendingSummary = async function (userId){
  var today = await db.get(
    `SELECT IFNULL(SUM(amount), 0) AS today_spending FROM transactions
    WHERE date = date('now') AND amount > 0 AND user_id = ?`,
    userId
  );
  if (today &&  today.today_spending !== null) {
    return { today_spending: today.today_spending };
  }
}

const weekSpendingSummary = async function (userId){
  var week = await db.get(
    `SELECT SUM(amount) AS week_spending FROM transactions
    WHERE date >= date('now', 'weekday 0', '-7 days') AND date <= date('now') AND amount > 0 AND user_id = ?`,
    userId
  );
  if (week && week.week_spending !== null) {
    return { week_spending: week.week_spending };
  }
}

const monthSpendingSummary = async function (userId){
  var month = await db.get(
    `SELECT SUM(amount) AS month_spending FROM transactions
    WHERE date >= date('now', 'start of month') AND date <= date('now') AND amount > 0 AND user_id = ?`,
    userId
  );

  if (month && month.month_spending !== null) {
    return { month_spending: month.month_spending };
  }
}

const yearSpendingSummary = async function (userId){
  var year = await db.get(
    `SELECT SUM(amount) AS year_spending FROM transactions
    WHERE  date >= date('now', 'start of year') AND date <= date('now') AND amount > 0 AND user_id = ?`,
    userId
  );
  if (year && year.year_spending !== null) {
    return { year_spending: year.year_spending };
  }
}


const getItemInfo = async function (itemId) {
  const result = await db.get(
    `SELECT user_id, access_token, transaction_cursor FROM items WHERE id=?`,
    itemId
  );
  return result;
};

const getItemInfoForUser = async function (itemId, userId) {
  const result = await db.get(
    `SELECT user_id, access_token, transaction_cursor FROM items 
    WHERE id= ? AND user_id = ?`,
    itemId,
    userId
  );
  return result;
};


const addNewTransaction = async function (transactionObj) {
  
  try {
    console.log(`Getting ready to insert ${JSON.stringify(transactionObj)}`);
    const result = await db.run(
      `
  INSERT INTO transactions 
    (id, user_id, account_id, category, date, authorized_date, name, amount,
    currency_code)
  VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      transactionObj.id,
      transactionObj.userId,
      transactionObj.accountId,
      transactionObj.category,
      transactionObj.date,
      transactionObj.authorizedDate,
      transactionObj.name,
      transactionObj.amount,
      transactionObj.currencyCode
    );

    return result;
  } catch (error) {
    console.log(
      `Looks like I'm encountering an error. ${JSON.stringify(error)}`
    );
    if (error.code === "SQLITE_CONSTRAINT") {
      console.log(`Maybe I'm reusing a cursor?`);
    }
  }

  
};


const modifyExistingTransaction = async function (transactionObj) {
  
  try {
    const result = await db.run(
      `UPDATE transactions 
      SET account_id = ?, category = ?, date = ?, 
      authorized_date = ?, name = ?, amount = ?, currency_code = ? 
      WHERE id = ?
      `,
      transactionObj.accountId,
      transactionObj.category,
      transactionObj.date,
      transactionObj.authorizedDate,
      transactionObj.name,
      transactionObj.amount,
      transactionObj.currencyCode,
      transactionObj.id
    );
    return result;
  } catch (error) {
    console.log(
      `Looks like I'm encountering an error. ${JSON.stringify(error)}`
    );
  }
   
};


const markTransactionAsRemoved = async function (transactionId) {
  
    try {
    const updatedId = transactionId + "-REMOVED-" + crypto.randomUUID();
    const result = await db.run(
      `UPDATE transactions SET id = ?, is_removed = 1 WHERE id = ?`,
      updatedId,
      transactionId
    );
    return result;
  } catch (error) {
    console.log(
      `Looks like I'm encountering an error. ${JSON.stringify(error)}`
    );
  }
  
};


const deleteExistingTransaction = async function (transactionId) {
  
    try {
    const result = await db.run(
      `DELETE FROM transactions WHERE id = ?`,
      transactionId
    );
    return result;
  } catch (error) {
    console.log(
      `Looks like I'm encountering an error. ${JSON.stringify(error)}`
    );
  }
  
};


const getTransactionsForUser = async function (userId, maxNum) {

  const results = await db.all(
    `SELECT transactions.*,
      accounts.name as account_name,
      items.bank_name as bank_name
    FROM transactions
    JOIN accounts ON transactions.account_id = accounts.id
    JOIN items ON accounts.item_id = items.id
    WHERE transactions.user_id = ?
      and is_removed = 0
    ORDER BY date DESC
    LIMIT ?`,
    userId,
    maxNum
  );
  return results;

};

const getFilteredTransactionsForUser = async function (userId, maxNum, filters) {
  let query = `SELECT transactions.*, accounts.name as account_name, items.bank_name as bank_name
               FROM transactions
               JOIN accounts ON transactions.account_id = accounts.id
               JOIN items ON accounts.item_id = items.id
               WHERE transactions.user_id = ? and is_removed = 0`;
  let queryParams = [userId];

  if (filters.startDate) {
    query += " AND date >= ?";
    queryParams.push(filters.startDate);
  }
  if (filters.endDate) {
    query += " AND date <= ?";
    queryParams.push(filters.endDate);
  }
  if (filters.category) {
    query += " AND category LIKE ?";
    queryParams.push(`%${filters.category}%`);
  }
  if (filters.minAmount) {
    query += " AND amount >= ?";
    queryParams.push(filters.minAmount);
  }
  if (filters.maxAmount) {
    query += " AND amount <= ?";
    queryParams.push(filters.maxAmount);
  }
  if (filters.starred) {
    // Check if starred is specifically true before adding this condition
    if (filters.starred === true) {
        query += " AND is_starred = 1";
    } else {
        query += " AND is_starred = 0";
    }
  }

  query += " ORDER BY date DESC LIMIT ?";
  queryParams.push(maxNum);
  console.log(query);
  console.log(queryParams);
  try {
    const results = await db.all(query, queryParams);
    return results;
  } catch (error) {
    console.error("Error fetching filtered transactions:", error);
    throw error;
  }
};

const updateTransactionStarStatus = (transactionId, isStarred) => {
  return new Promise((resolve, reject) => {
      const sql = `UPDATE transactions SET is_starred = ? WHERE id = ?`;
      db.run(sql, [isStarred, transactionId], function(err) {
          if (err) {
              reject(err);
          } else {
              resolve({ id: this.lastID, changes: this.changes });
          }
      });
  });
};


const saveCursorForItem = async function (transactionCursor, itemId) {
  try {
    await db.run(
      `UPDATE items SET transaction_cursor = ? WHERE id = ?`,
      transactionCursor,
      itemId
    );
  } catch (error) {
    console.error(
      `It's a big problem that I can't save my cursor. ${JSON.stringify(error)}`
    );
  }
};

module.exports = {
  debugExposeDb,
  getItemIdsForUser,
  getItemsAndAccessTokensForUser,
  getAccountIdsForItem,
  confirmItemBelongsToUser,
  deactivateItem,
  addUser,
  getPasswordByUserId,
  deleteUser,
  getUserList,
  getUserRecord,
  getUserByUserID,
  getBankNamesForUser,
  addItem,
  addBankNameForItem,
  addAccount,
  addBudget,
  getBudget,
  getMonthlySpending,
  todaySpendingSummary,
  weekSpendingSummary,
  monthSpendingSummary,
  yearSpendingSummary,
  getItemInfo,
  getItemInfoForUser,
  addNewTransaction,
  modifyExistingTransaction,
  deleteExistingTransaction,
  markTransactionAsRemoved,
  getTransactionsForUser,
  updateTransactionStarStatus,
  saveCursorForItem,
  getFilteredTransactionsForUser,
};
