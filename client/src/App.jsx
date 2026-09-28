import { useState } from "react";
import Signup from "./components/Signup";
import Login from "./components/Login";
import "./App.css";

function App() {
// Keep track of which form the user is currently viewing.
const [showSignup, setShowSignup] = useState(true);

return ( <main className="app"> <h1>My Account</h1>

  <div className="switch-buttons">
    <button
      type="button"
      className={showSignup ? "active" : ""}
      onClick={() => setShowSignup(true)}
    >
      Sign Up
    </button>

    <button
      type="button"
      className={!showSignup ? "active" : ""}
      onClick={() => setShowSignup(false)}
    >
      Log In
    </button>
  </div>

  {showSignup ? <Signup /> : <Login />}
</main>


);
}

export default App;