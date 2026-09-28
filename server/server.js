require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");

const app = express();

// Allow Express to receive JSON data from React.
app.use(express.json());

// Allow the React frontend to communicate with the Express server.
app.use(cors());

// Create a MongoDB client using the connection string
// stored in the .env file.
const client = new MongoClient(process.env.MONGO_URI);

// Variable that stores the MongoDB users collection.
let users;

// Connect to MongoDB.
async function connectDatabase() {
try {
await client.connect();

console.log("Connected to MongoDB");

// Select the pa2 database.
const db = client.db("pa2");

// Select the users collection.
const collection = db.collection("users");

// Store the collection in the users variable so
// the Signup and Login routes can use it.
users = collection;

} catch (error) {
console.error("Could not connect to MongoDB");
console.error(error);
}
}

// Simple route to verify that the Express server is running.
app.get("/", (req, res) => {
res.json({
message: "Server is running",
});
});

// --------------------------------------------------
// SIGNUP ROUTE
// --------------------------------------------------

app.post("/signup", async (req, res) => {
try {
// Get all four Signup fields from the request sent by React.
const { f_name, l_name, username, password } = req.body;

// Check that all required fields were provided.
if (!f_name || !l_name || !username || !password) {
  return res.status(400).json({
    message: "All Signup fields are required",
  });
}

// Search MongoDB for a user with the requested username.
const existingUser = await users.findOne({
  username: username,
});

// If a user with this username already exists,
// do not create another user.
if (existingUser) {
  return res.status(409).json({
    message: "Username already exists",
  });
}

// Create the new user in MongoDB.
await users.insertOne({
  f_name: f_name,
  l_name: l_name,
  username: username,
  password: password,
});

// Tell the React frontend that the user was created.
res.status(201).json({
  message: "User created successfully",
});

} catch (error) {
// Display the detailed error in the server terminal.
console.error(error);

// Send a simple error message to the frontend.
res.status(500).json({
  message: "Server error",
});

}
});

// --------------------------------------------------
// LOGIN ROUTE
// --------------------------------------------------

app.post("/login", async (req, res) => {
try {
// Get the username and password from React.
const { username, password } = req.body;

// Check that both Login fields were provided.
if (!username || !password) {
  return res.status(400).json({
    message: "Username and password are required",
  });
}

// Search MongoDB for the submitted username.
const user = await users.findOne({
  username: username,
});

// If the username was not found, Login fails.
if (!user) {
  return res.status(401).json({
    message: "Invalid username or password",
  });
}

// Compare the submitted password with the password
// stored in the MongoDB user document.
if (user.password !== password) {
  return res.status(401).json({
    message: "Invalid username or password",
  });
}

// The username and password matched.
res.status(200).json({
  message: "Login successful",
});

} catch (error) {
// Display the detailed error in the server terminal.
console.error(error);

// Send a simple error message to the frontend.
res.status(500).json({
  message: "Server error",
});

}
});

// Start the Express server on port 9000.
app.listen(9000, () => {
console.log("Server running on port 9000");
});

// Connect to MongoDB.
connectDatabase();