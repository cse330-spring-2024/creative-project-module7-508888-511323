const express = require("express");
const { getLoggedInUserId } = require("../utils");
const db = require("../db");
const { plaidClient } = require("../plaid");
const { setTimeout } = require("timers/promises");
const { SimpleTransaction } = require("../simpleTransactionObject");

const router = express.Router();

/**
 * This will ask our server to make a transactions sync call
 * against all the items it has for a particular user. This is one way
 * you can keep your transaction data up to date, but it's preferable
 * to just fetch data for a single item in response to a webhook.
 */
router.post("/sync", async (req, res, next) => {
  try {
    const userId = getLoggedInUserId(req);
    const items = await db.getItemIdsForUser(userId);
    const fullResults = await Promise.all(
      items.map(async(item) =>{
        return await syncTransactions(item.id)
      })
    );
    res.json({ completeResults: fullResults});
    items.forEach((item) => {
      syncTransactions(item.id);
    })

    //res.json({ todo: "Implement this method" });
  } catch (error) {
    console.log(`Running into an error!`);
    next(error);
  }
});

const fetchNewSyncData = async function (accessToken, initialCursor) {
  let keepGoing = false;
  const allData = {
    added: [], 
    modified: [], 
    removed: [], 
    nextCursor: initialCursor,
  };
  do {
    const results = await plaidClient.transactionsSync({
      access_token: accessToken,
      cursor: allData.nextCursor,
      options: {
        include_personal_finance_category: true,
      }
    });
    const newData = results.data;
    allData.added = allData.added.concat(newData.added);
    allData.modified = allData.modified.concat(newData.modified);
    allData.removed = allData.removed.concat(newData.removed);
    allData.nextCursonr = newData.next_cursor;
    keepGoing = newData.has_more;
    console.log(
      `Added: ${newData.added.length} Modified: ${newData.modified.length} Removed: ${newData.removed.length}`
    );
  } while (keepGoing === true);

    allData.removed.push({
      transaction_id: "zWdrDDlDPrtAmepbEAWAcGJZ7zZ9GouldaM4l",
    });

  console.log(`All done!`);
  console.log(`Your final cursor: ${allData.nextCursor}`);
  return allData;
};

/**
 * Given an item ID, this will fetch all transactions for all accounts
 * associated with this item using the sync API. We can call this manually
 * using the /sync endpoint above, or we can call this in response
 * to a webhook
 */
const syncTransactions = async function (itemId) {
  const summary = { 
    added: 0, 
    removed: 0, 
    modified: 0 
  };
  // 1. Fetch most recent cursor from database
  const {
    access_token: accessToken, 
    transaction_cursor: transactionCursor, 
    user_id: userId,
  } = await db.getItemInfo(itemId);

  // 2. Fetch all transactions since the last cursor
  const allData = await fetchNewSyncData(accessToken, transactionCursor);
  
  // 3. Add new transactions to our database
  await Promise.all(allData.added.map(async (txnObj) => {
    const simpleTransaction = SimpleTransaction.fromPlaidTransaction(
      txnObj, 
      userId
    );
    //console.log(`I want to add ${JSON.stringify(simpleTransaction)}`);
    const result = await db.addNewTransaction(simpleTransaction);
    if (result) {
      summary.added += result.changes;
    }
  })
);
  // 4. Updated any modified transactions
  await Promise.all(allData.modified.map(async (txnObj) => {
    const simpleTransaction = SimpleTransaction.fromPlaidTransaction(
      txnObj, 
      userId
    );
    //console.log(`I want to add ${JSON.stringify(simpleTransaction)}`);
    const result = await db.modifyExistingTransaction(simpleTransaction);
    if (result) {
      summary.modified += result.changes;
    }
  })
);

//get id of transaction when they press button to delete it. pass id in this method
  // 5. Do something with removed transactions
  await Promise.all(allData.removed.map(async (txnMini) => {
    const result = await db.markTransactionAsRemoved(txnMini.transaction_id);
    if(result){
      summary.removed += result.changes;
    }
  })
  
);


  // 6. Save our most recent cursor
  await db.saveCursorForItem(allData.nextCursor, itemId);
  //print all transactions info: 
  //console.dir(results.data, {depth: null, colors: true});
  return summary;
};

/**
 * Fetch all the transactions for a particular user (up to a limit)
 * This is really just a simple database query, since our server has already
 * fetched these items using the syncTransactions call above
 *
 */
router.get("/list", async (req, res, next) => {
  try {
    const userId = getLoggedInUserId(req);
    const maxCount = req.params.maxCount ?? 50;
    const transactions = await db.getTransactionsForUser(userId, maxCount);
    res.json(transactions);
  } catch (error) {
    console.log(`Running into an error!`);
    next(error);
  }
});

module.exports = { router, syncTransactions };
