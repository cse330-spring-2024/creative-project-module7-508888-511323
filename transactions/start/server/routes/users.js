const express = require("express");
const escape = require("escape-html");
const { v4: uuidv4 } = require("uuid");
const { getLoggedInUserId } = require("../utils");
const db = require("../db");

const router = express.Router();
const bcrypt = require("bcrypt");
const saltRounds = 10;

/**
 * Methods and endpoints for signing in, signing out, and creating new users.
 * For the purpose of this sample, we're simply setting / fetching a cookie that
 * contains the userID as our way of getting the ID of our signed-in user.
 */
router.post("/create", async (req, res, next) => {
  try {
    const username = escape(req.body.username);
    const password = escape(req.body.password);
    const userId = uuidv4();
    //const result = await db.addUser(userId, username);
    const result = await db.addUser(userId, username, password);
    console.log(`User creation result is ${JSON.stringify(result)}`);
    if (result["lastID"] != null) {
      res.cookie("signedInUser", userId, {
        maxAge: 1000 * 60 * 60 * 24 * 30,
        httpOnly: true,
      });
    }
    res.json(result);
  } catch (error) {
    next(error);
  }
  // try {
  //   const { username, password } = req.body;
  //   const hashedPassword = await bcrypt.hash(password, saltRounds);
  //   const userId = uuidv4();
  //   const result = await db.addUser(userId, username, hashedPassword);
  //   // handle result and respond
  // } catch (error) {
  //   next(error);
  // }
});

router.get("/list", async (req, res, next) => {
  try {
    const result = await db.getUserList();
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post("/sign_in", async (req, res, next) => {
  console.log(`I am in sign_in`);
  // try {
  //   const userId = escape(req.body.userId);
  //   const username = escape(req.body.username);
  //   const password = escape(req.body.password);
  //   res.cookie("signedInUser", userId, {
  //     maxAge: 1000 * 60 * 60 * 24 * 30,
  //     httpOnly: true,
  //   });
  //   res.json({ signedIn: true });
  // } catch (error) {
  //     next(error);
  //   }


  
//   try {
//     const { username, password } = req.body;
//     console.log("Received:", username, password);  // Debug log
//     const user = await db.getUserByUsername(username);
//     if (user && user.password && password) {
//         console.log("Hashed Password:", user.password);  // Debug log
//         console.log("Setting userID:", user.id);
//         console.log("Retrieved userID from session:", req.session.userID);
//         console.log("Retrieved userID from cookie:", req.cookies.userID);
//         const match = await bcrypt.compare(password, user.password);
//         if (match) {
//             res.json({ signedIn: true, message: "Login successful" });
//         } else {
//             res.status(401).json({ signedIn: false, message: "Invalid credentials" });
//         }
//     } else {
//         res.status(401).json({ signedIn: false, message: "User not found or data missing" });
//     }
// } catch (error) {
//     console.error("Login Error:", error);
//     next(error);
// }



  // try {
  //   const userId = escape(req.body.userId);
  //   const username = escape(req.body.username);
  //   const password = escape(req.body.password);
  //   const correctPW = await db.getPasswordByUserId(userId);
  //   console.log(userId);
  //   console.log(password);
  //   console.log(correctPW);
  //   if (userId && await bcrypt.compare(password, correctPW)) {
  //         // set cookie or session
  //         res.json({ signedIn: true });
  //         res.cookie("signedInUser", userId, {
  //           maxAge: 1000 * 60 * 60 * 24 * 30,
  //           httpOnly: true,
  //         });
  //       } else {
  //         res.status(401).json({ signedIn: false, message: "Invalid username or password" });
  //       }
  //   res.json(result);
  // } catch (error) {
  //   next(error);
  // }

  try {
    const userId = escape(req.body.userId);
    //const username = req.body.username;
    const password = req.body.password;
    const user = await db.getUserByUserID(userId); // Assume this function fetches the user by username
    console.log(user.username);
    console.log(user.password);
    if (user && await bcrypt.compare(password, user.password)) {
      // set cookie or session
      res.cookie("signedInUser", userId, {
            maxAge: 1000 * 60 * 60 * 24 * 30,
            httpOnly: true,
      });
      res.json({ signedIn: true });
    } else {
      res.status(401).json({ signedIn: false, message: "Invalid username or password" });
    }
  } catch (error) {
    next(error);
  }
});

router.post("/sign_out", async (req, res, next) => {
  try {
    res.clearCookie("signedInUser");
    res.json({ signedOut: true });
  } catch (error) {
    next(error);
  }
});

router.post("/delete", async (req, res, next) => {
  try {
    //const userId = req.body.userId;
    const userId = getLoggedInUserId(req);
    const result = await db.deleteUser(userId);
    if (result.changes) {
      res.clearCookie("signedInUser");  // Clear session cookie
      res.json({ deleted: true, message: "User deleted successfully" });
    } else {
      res.json({ deleted: false, message: "User not found" });
    }
  } catch (error) {
    next(error);
  }
});

router.post("/budget", async (req, res, next) => {
  try {
    const budget = escape(req.body.budget);
    const userId = getLoggedInUserId(req);
    const result = await db.addBudget(userId, budget);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get("/getBudget", async (req, res, next) => {
  try {
      const userId = getLoggedInUserId(req); 
      const result = await db.getBudget(userId);
      res.json(result);
  } catch (error) {
      next(error);
  }
});

router.get("/getMonthlySpending", async (req, res, next) => {
  try {
      const userId = getLoggedInUserId(req); 
      const result = await db.getMonthlySpending(userId);
      res.json(result);
      console.log("THIS RESULT" + result);
  } catch (error) {
      next(error);
  }
});

router.get("/todaySpendingSummary", async (req, res, next) => {
  try {
      const userId = getLoggedInUserId(req); 
      const result = await db.todaySpendingSummary(userId);
      res.json(result);
  } catch (error) {
      next(error);
  }
});

router.get("/weekSpendingSummary", async (req, res, next) => {
  try {
      const userId = getLoggedInUserId(req); 
      const result = await db.weekSpendingSummary(userId);
      res.json(result);
  } catch (error) {
      next(error);
  }
});

router.get("/monthSpendingSummary", async (req, res, next) => {
  try {
      const userId = getLoggedInUserId(req); 
      const result = await db.monthSpendingSummary(userId);
      res.json(result);
  } catch (error) {
      next(error);
  }
});

router.get("/yearSpendingSummary", async (req, res, next) => {
  try {
      const userId = getLoggedInUserId(req); 
      const result = await db.yearSpendingSummary(userId);
      res.json(result);
  } catch (error) {
      next(error);
  }
});

router.get('/highestSpendingDisplay', async (req, res) => {
    const userId = getLoggedInUserId(req);
    const result = await db.highestSpendingDisplay(userId);
    res.json(result);
});

/**
 * Get the id and username of our currently logged in user, if any.
 */
router.get("/get_my_info", async (req, res, next) => {
  try {
    const userId = getLoggedInUserId(req);
    console.log(`Your userID is ${userId}`);
    let result;
    if (userId != null) {
      const userObject = await db.getUserRecord(userId);
      if (userObject == null) {
        // This probably means your cookies are messed up.
        res.clearCookie("signedInUser");
        res.json({ userInfo: null });
        return;
      } else {
        result = { id: userObject.id, username: userObject.username, password: userObject.password};
      }
    } else {
      result = null;
    }
    res.json({ userInfo: result });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
