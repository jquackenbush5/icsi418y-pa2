import { useState } from "react";

function Signup() {
// Store the first name entered by the user.
const [f_name, setFName] = useState("");

// Store the last name entered by the user.
const [l_name, setLName] = useState("");

// Store the username entered by the user.
const [username, setUsername] = useState("");

// Store the password entered by the user.
const [password, setPassword] = useState("");

// Store messages that will be displayed to the user.
const [message, setMessage] = useState("");

async function handleSubmit(event) {
// Prevent the browser from refreshing the page when the form is submitted.
event.preventDefault();

// Clear the previous message.
setMessage("");

try {
  // Send all four Signup fields to the Express backend.
  const response = await fetch("http://localhost:9000/signup", {
    method: "POST",

    // Tell Express that JSON is being sent.
    headers: {
      "Content-Type": "application/json",
    },

    // Convert the JavaScript object into JSON.
    body: JSON.stringify({
      f_name: f_name,
      l_name: l_name,
      username: username,
      password: password,
    }),
  });

  // Read the JSON response sent back by Express.
  const data = await response.json();

  // Check whether the server reported success.
  if (response.ok) {
    setMessage(data.message);

    // Clear the form after a successful Signup.
    setFName("");
    setLName("");
    setUsername("");
    setPassword("");
  } else {
    // Display the error message returned by the server.
    setMessage(data.message);
  }
} catch (error) {
  // React cannot communicate with Express.
  setMessage("Could not connect to the server.");
}

}

return ( <div className="form-container"> <h2>Sign Up</h2>

  <form onSubmit={handleSubmit}>
    <div className="form-group">
      <label htmlFor="signup-f-name">First Name</label>

      <input
        id="signup-f-name"
        type="text"
        value={f_name}
        onChange={(event) => setFName(event.target.value)}
        placeholder="Enter first name"
      />
    </div>

    <div className="form-group">
      <label htmlFor="signup-l-name">Last Name</label>

      <input
        id="signup-l-name"
        type="text"
        value={l_name}
        onChange={(event) => setLName(event.target.value)}
        placeholder="Enter last name"
      />
    </div>

    <div className="form-group">
      <label htmlFor="signup-username">Username</label>

      <input
        id="signup-username"
        type="text"
        value={username}
        onChange={(event) => setUsername(event.target.value)}
        placeholder="Enter username"
      />
    </div>

    <div className="form-group">
      <label htmlFor="signup-password">Password</label>

      <input
        id="signup-password"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="Enter password"
      />
    </div>

    <button type="submit">Sign Up</button>
  </form>

  {message && <p className="message">{message}</p>}
</div>

);
}

export default Signup;