
import { useState } from "react";

import Signup from "./components/Signup";
import Login from "./components/Login";
import Projects from "./components/Projects";
import ProjectMemberships from "./components/ProjectMemberships";
import UserStories from "./components/UserStories";

import "./App.css";

function App() {
  // Track which section the user is currently viewing.
  const [activePage, setActivePage] = useState("signup");

  // Define the navigation options in one place.
  const navigationItems = [
    { id: "signup", label: "Sign Up" },
    { id: "login", label: "Log In" },
    { id: "projects", label: "Projects" },
    { id: "memberships", label: "Project Memberships" },
    { id: "stories", label: "User Stories" },
  ];

  // Display the component associated with the selected navigation option.
  function renderPage() {
    switch (activePage) {
      case "signup":
        return <Signup />;

      case "login":
        return <Login />;

      case "projects":
        return <Projects />;

      case "memberships":
        return <ProjectMemberships />;

      case "stories":
        return <UserStories />;

      default:
        return <Signup />;
    }
  }

  return (
    <main className="app">
      <header className="app-header">
        <h1>Project Management</h1>
        <p className="app-subtitle">
          Manage your account, projects, memberships, and user stories.
        </p>
      </header>

      <nav className="switch-buttons" aria-label="Main navigation">
        {navigationItems.map((item) => (
          <button
            key={item.id}
            type="button"
            className={activePage === item.id ? "active" : ""}
            onClick={() => setActivePage(item.id)}
            aria-current={activePage === item.id ? "page" : undefined}
          >
            {item.label}
          </button>
        ))}
      </nav>

      <div className="page-content">{renderPage()}</div>

      <footer className="app-footer">
        <p>PA4 — Projects, Project Memberships, and User Stories</p>
      </footer>
    </main>
  );
}

export default App;