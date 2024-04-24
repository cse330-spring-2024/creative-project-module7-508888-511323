import { callMyServer, showSelector, hideSelector, resetUI } from "./utils.js";
import { refreshConnectedBanks, clientRefresh } from "./client.js";

export const createNewUser = async function () {
  const newUsername = document.querySelector("#username").value;
  const password = document.querySelector("#password").value;
  await callMyServer("/server/users/create", true, {
    username: newUsername,
    password: password,
  });
  await refreshSignInStatus();
};

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
  const userId = document.querySelector("#existingUsersSelect").value;
  const password = document.querySelector("#passwordLogin").value;
  await callMyServer("/server/users/sign_in", true, { userId: userId, password: password });
  document.querySelector("#budgetOptions").style.display = 'none';
  await refreshSignInStatus();
};

export const signOut = async function () {
  await callMyServer("/server/users/sign_out", true);
  await refreshSignInStatus();
  resetUI();
};


export const deleteUser = async function () {
  const userId = document.querySelector("#existingUsersSelect").value;
  await callMyServer(`/server/users/delete`, true, { userId: userId });
  await refreshSignInStatus();
};

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
