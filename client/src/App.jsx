import {useEffect, useState} from 'react'
import reactLogo from './assets/react.svg'
import axios from "axios";
import {usePlaidLink} from 'react-plaid-link'
import viteLogo from '/vite.svg'
//import './App.css'
axios.defaults.baseURL ="http://localhost:8000"

function PlaidAuth({publicToken}) {
     const [account, setAccount] = useState();
     const [transactions, setTransactions] = useState({ added: [], modified: [], removed: [] });
     const [cursor, setCursor] = useState(null);
 
     useEffect(() => {
          async function fetchData() {
               let accessTokenResponse = await axios.post("/exchange_public_token", {public_token: publicToken});
               let accessToken = accessTokenResponse.data.accessToken;
               console.log("Access Token: ", accessToken);
 
               const auth = await axios.post("/auth", {access_token: accessToken});
               console.log("auth data: ", auth.data);
               setAccount(auth.data.numbers.ach[0]);
 
               // Fetch transactions
               const transactionResponse = await axios.post('/transactions_sync', {
                   access_token: accessToken,
                   cursor: cursor,
               });
               setTransactions({
                   added: transactionResponse.data.added,
                   modified: transactionResponse.data.modified,
                   removed: transactionResponse.data.removed
               });
               setCursor(transactionResponse.data.cursor);
          }
          fetchData();
     }, []);
 
     return (
         <div>
             {account && (
                 <>
                     <p>Account Number: {account.account} </p>
                     <p>Routing Number: {account.routing} </p>
                 </>
             )}
             <div>
                 <h3>Transactions</h3>
                 {transactions.added.map((transaction, index) => (
                     <div key={index}>
                         <p>Transaction: {transaction.name} Amount: ${transaction.amount}</p>
                     </div>
                 ))}
             </div>
         </div>
     );
 }
 
 const plaid = require('plaid');

 const client = new plaid.Client({
   clientID: 'YOUR_CLIENT_ID',
   secret: 'YOUR_SANDBOX_SECRET',
   env: plaid.environments.sandbox,
 });
 
 const createSandboxPublicToken = async () => {
   try {
     const response = await client.sandboxPublicTokenCreate('ins_109508', ['transactions'], {
       override_username: 'user_good',
       override_password: JSON.stringify({
         transactions: [{
           date_transacted: "2023-10-01",
           date_posted: "2023-10-03",
           currency: "USD",
           amount: 100,
           description: "1 year Netflix subscription"
         }]
       })
     });
     console.log('Sandbox public token:', response.public_token);
     return response.public_token;
   } catch (error) {
     console.error('Error creating sandbox public token:', error);
   }
 };
 
 createSandboxPublicToken();
 
function fetchTransactions(accessToken) {
     const [transactions, setTransactions] = useState({ added: [], modified: [], removed: [] });
     const [cursor, setCursor] = useState(null);
 
     useEffect(() => {
         async function loadTransactions() {
             try {
                 const response = await axios.post('/transactions_sync', {
                     access_token: accessToken,
                     cursor: cursor,
                 });
                 setTransactions({
                     added: response.data.added,
                     modified: response.data.modified,
                     removed: response.data.removed
                 });
                 setCursor(response.data.cursor);
             } catch (error) {
                 console.error("Failed to fetch transactions: ", error);
             }
         }
 
         if (accessToken) {
             loadTransactions();
         }
     }, [accessToken, cursor]);
 
     return transactions;
 }
 

function App() {
     const [linkToken, setLinkToken] = useState();
     const [publicToken, setPublicToken] = useState();
     useEffect(() => {
           async function fetch() {
               try {
                    const response = await axios.post("/create_link_token");
                    setLinkToken(response.data.link_token);
                } catch (error) {
                    console.error("There was an error!", error);
                }
          }
          fetch();
     }, []);
	const { open, ready } = usePlaidLink({
          token: linkToken,
          onSuccess: (public_token, metadata) => {
               setPublicToken(public_token);
               console.log("Success ", public_token, metadata)
          },
        });
        
        return publicToken ? (<PlaidAuth publicToken = {publicToken}/>) : (
          <button onClick={() => open()} disabled={!ready}>
            Connect a bank account
          </button>
        );
}

export default App;
