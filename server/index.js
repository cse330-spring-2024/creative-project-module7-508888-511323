const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');

const configuration = new Configuration({
  basePath: PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': '6615947e5b0a98001c90c645',
      'PLAID-SECRET': '0c86ecd4a0c77aa98f6e0e0e16af73',
    },
  },
});
const plaidClient = new PlaidApi(configuration);

const app = express();
app.use(cors());
app.use(bodyParser.json());


app.post("/hello", (request, response) => {
    response.json({message: "hello " + request.body.name});
});

app.post('/create_link_token', async function (request, response) {
    // Get the client_user_id by searching for the current user
    const plaidRequest = {
      user: {
        // This should correspond to a unique id for the current user.
        client_user_id: 'user',
      },
      client_name: 'Plaid Test App',
      products: ['auth'],
      language: 'en',
      redirect_uri: 'http://localhost:5173/',
      country_codes: ['US'],
    };
    try {
      const createTokenResponse = await plaidClient.linkTokenCreate(plaidRequest);
      response.json(createTokenResponse.data);
    } catch (error) {
        response.status(500).send('failure');
      // handle error
    }
  });

  app.post('/auth', async function (request, response) {
    try {
        const access_token = request.body.access_token;
        const plaidRequest = {
            access_token: access_token,
          };
        const plaidResponse = await plaidClient.authGet(plaidRequest);
        response.json(plaidResponse.data);
    }
    catch(e) {
        response.status(500).send("failure");
    }
  });

  app.post('/transactions_sync', async function (request, response) {
    const accessToken = request.body.access_token;
    let cursor = request.body.cursor || null;  // Receive cursor from client or start with null

    let addedTransactions = [];
    let modifiedTransactions = [];
    let removedTransactions = [];
    let hasMore = true;

    try {
        while (hasMore) {
            const syncRequest = {
                access_token: accessToken,
                cursor: cursor,
            };
            const syncResponse = await plaidClient.transactionsSync(syncRequest);
            const data = syncResponse.data;

            addedTransactions = addedTransactions.concat(data.added);
            modifiedTransactions = modifiedTransactions.concat(data.modified);
            removedTransactions = removedTransactions.concat(data.removed);
            hasMore = data.has_more;
            cursor = data.next_cursor;  // Update cursor for next page
        }

        // Respond with all transactions
        response.json({
            added: addedTransactions,
            modified: modifiedTransactions,
            removed: removedTransactions,
            cursor: cursor  // Send back the latest cursor
        });
    } catch (error) {
        console.error("Error fetching transactions: ", error);
        response.status(500).send("Error fetching transactions");
    }
});

  app.post('/exchange_public_token', async function (
    request,
    response,
    next,
  ) {
    const publicToken = request.body.public_token;
    try {
      const plaidResponse = await plaidClient.itemPublicTokenExchange({
        public_token: publicToken,
      });
  
      // These values should be saved to a persistent database and
      // associated with the currently signed-in user
      const accessToken = plaidResponse.data.access_token;  
      response.json({ accessToken });
    } catch (error) {
        response.status(500).send("failure");
      // handle error
    }
  });
app.listen(8000, () => {
    console.log("server has started");
});
