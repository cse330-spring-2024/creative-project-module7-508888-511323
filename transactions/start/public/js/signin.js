import { callMyServer, showSelector, hideSelector, resetUI } from "./utils.js";
import { refreshConnectedBanks, clientRefresh } from "./client.js";
//import { getUserByUsername } from "../../server/db.js";
/**
 * Methods to handle signing in and creating new users. Because this is just
 * a sample, we decided to skip the whole "creating a password" thing.
 */

export const createNewUser = async function () {
  const newUsername = document.querySelector("#username").value;
  const password = document.querySelector("#password").value;
  await callMyServer("/server/users/create", true, {
    username: newUsername,
    password: password,
  });
  await refreshSignInStatus();
};

/**
 * Get a list of all of our users on the server.
 */
const getExistingUsers = async function () {
  const usersList = await callMyServer("/server/users/list");
  if (usersList.length === 0) {
    hideSelector("#existingUsers");
  } else {
    showSelector("#existingUsers");
    document.querySelector("#existingUsersSelect").innerHTML = usersList.map(
      (userObj) => `<option value="${userObj.id}">${userObj.username}</option>`
    );
  }
};

export const signIn = async function () {
  // const userId = document.querySelector("#existingUsersSelect").value;
  // const username = document.querySelector("#usernameLogin").value;
  // const password = document.querySelector("#password").value;
  // await callMyServer("/server/users/sign_in", true, {userId: userId, username: username, password: password });
  // await refreshSignInStatus();
  // Ensure this function handles both username and password

  const userId = document.querySelector("#existingUsersSelect").value;
  const username = document.querySelector("#usernameLogin").value;
  const password = document.querySelector("#passwordLogin").value;
  await callMyServer("/server/users/sign_in", true, { userId: userId, username: username, password: password });
  await refreshSignInStatus();



  // const userId = document.querySelector("#existingUsersSelect").value;
  // console.log(userId);
  // const username = document.querySelector("#usernameLogin").value;
  // console.log(username);
  // const password = document.querySelector("#passwordLogin").value;
  // console.log(password);
  // await callMyServer("/server/users/sign_in", true, { userId: userId, username: username, password: password});
  // await refreshSignInStatus();
};

export const signOut = async function () {
  await callMyServer("/server/users/sign_out", true);
  await refreshSignInStatus();
  resetUI();
};

export const deleteUser = async function () {
  const userId = document.querySelector("#existingUsersSelect").value; // assuming the user ID is selected from a dropdown or stored in a variable
  await callMyServer(`/server/users/delete`, true, { userId: userId });
  await refreshSignInStatus();  // Refresh or update UI accordingly
  //resetUI();  // Reset UI or redirect to a safe page
};

// Add event listener to the new button
document.getElementById('deleteUser').addEventListener('click', deleteUser);


export const refreshSignInStatus = async function () {
  const userInfoObj = await callMyServer("/server/users/get_my_info");
  const userInfo = userInfoObj.userInfo;
  if (userInfo == null) {
    showSelector("#notSignedIn");
    hideSelector("#signedIn");
    getExistingUsers();
  } else {
    showSelector("#signedIn");
    hideSelector("#notSignedIn");
    document.querySelector("#welcomeMessage").textContent = `Signed in as ${
      userInfo.username
    } (user ID #${userInfo.id.substr(0, 8)}...)`;
    await refreshConnectedBanks();

    await clientRefresh();
  }
};
