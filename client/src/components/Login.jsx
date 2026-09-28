import { useState } from "react";

function Login() {
// Store the username entered into the login form.
const [username, setUsername] = useState("");

// Store the password entered into the login form.
const [password, setPassword] = useState("");

// Store the message returned by the server.
const [message, setMessage] = useState("");

async function handleSubmit(event) {
// Prevent the browser from performing its normal form submission.
event.preventDefault();

// Clear the previous message.
setMessage("");

try {
  // Send the login information to the Express server.
  const response = await fetch("http://localhost:9000/login", {
    method: "POST",

    // Tell Express that the request body contains JSON.
    headers: {
      "Content-Type": "application/json",
    },

    // Convert the username and password into JSON.
    body: JSON.stringify({
      username: username,
      password: password,
    }),
  });

  // Read the JSON response from Express.
  const data = await response.json();

  // Check whether the server returned a successful status code.
  if (response.ok) {
    setMessage(data.message);
  } else {
    // Display the error returned by the server.
    setMessage(data.message);
  }
} catch (error) {
  // Error if the React application cannot reach Express.
  setMessage("Could not connect to the server.");
}

}

return ( <div className="form-container"> <h2>Log In</h2>

  <form onSubmit={handleSubmit}>
    <div className="form-group">
      <label htmlFor="login-username">Username</label>

      <input
        id="login-username"
        type="text"
        value={username}
        onChange={(event) => setUsername(event.target.value)}
        placeholder="Enter username"
      />
    </div>

    <div className="form-group">
      <label htmlFor="login-password">Password</label>

      <input
        id="login-password"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="Enter password"
      />
    </div>

    <button type="submit">Log In</button>
  </form>

  {message && <p className="message">{message}</p>}
</div>


);
}

export default Login;