
import { useEffect, useState } from "react";

// The Express backend is running on port 9000.
const API_URL = "http://localhost:9000";

function Projects() {
  // Store the registered users used to populate the project-lead dropdown.
  const [users, setUsers] = useState([]);

  // Store all projects returned by the backend.
  const [projects, setProjects] = useState([]);

  // Store the values entered into the create-project form.
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState("Planning");
  const [projectLeadId, setProjectLeadId] = useState("");

  // Track loading and feedback states.
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Display a user's name, falling back to their username if necessary.
  function getUserLabel(user) {
    const fullName = `${user.f_name || ""} ${user.l_name || ""}`.trim();

    return fullName
      ? `${fullName} (@${user.username})`
      : user.username;
  }

  // Load users and projects from the backend.
  async function loadData() {
    setLoading(true);
    setError("");

    try {
      const [usersResponse, projectsResponse] = await Promise.all([
        fetch(`${API_URL}/users`),
        fetch(`${API_URL}/projects`),
      ]);

      const usersData = await usersResponse.json();
      const projectsData = await projectsResponse.json();

      if (!usersResponse.ok) {
        throw new Error(usersData.message || "Could not load users.");
      }

      if (!projectsResponse.ok) {
        throw new Error(projectsData.message || "Could not load projects.");
      }

      setUsers(Array.isArray(usersData) ? usersData : []);
      setProjects(Array.isArray(projectsData) ? projectsData : []);

      // Choose the first registered user as the initial dropdown selection.
      if (Array.isArray(usersData) && usersData.length > 0) {
        setProjectLeadId((currentId) => {
          const stillExists = usersData.some(
            (user) => user._id === currentId
          );

          return stillExists ? currentId : usersData[0]._id;
        });
      } else {
        setProjectLeadId("");
      }
    } catch (err) {
      setError(
        err.message ||
          "Unable to connect to the backend. Make sure Express is running."
      );
    } finally {
      setLoading(false);
    }
  }

  // Load initial data when this component first appears.
  useEffect(() => {
    loadData();
  }, []);

  // Send the form data to Express to create a project.
  async function handleCreateProject(event) {
    event.preventDefault();

    setMessage("");
    setError("");

    if (!name.trim()) {
      setError("Please enter a project name.");
      return;
    }

    if (!projectLeadId) {
      setError("Please select a registered project lead.");
      return;
    }

    setCreating(true);

    try {
      const response = await fetch(`${API_URL}/projects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          status,
          project_lead_id: projectLeadId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not create the project.");
      }

      setMessage("Project created successfully.");
      setName("");
      setDescription("");
      setStatus("Planning");

      // Reload projects so the new project appears immediately.
      await loadData();
    } catch (err) {
      setError(err.message || "An error occurred while creating the project.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <section className="feature-page">
      <div className="page-heading">
        <h2>Project Management</h2>
        <p>Create projects and assign a registered project lead.</p>
      </div>

      {message && <p className="notice success">{message}</p>}
      {error && <p className="notice error">{error}</p>}

      <div className="content-card">
        <h3>Create a Project</h3>

        {users.length === 0 && !loading && (
          <p className="notice error">
            No registered users were found. Create a user account before
            creating a project.
          </p>
        )}

        <form onSubmit={handleCreateProject}>
          <div className="form-group">
            <label htmlFor="project-name">Project Name</label>
            <input
              id="project-name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Enter project name"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="project-description">Description</label>
            <textarea
              id="project-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe the project"
              rows="3"
            />
          </div>

          <div className="form-group">
            <label htmlFor="project-status">Status</label>
            <select
              id="project-status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="Planning">Planning</option>
              <option value="Active">Active</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="project-lead">Project Lead</label>
            <select
              id="project-lead"
              value={projectLeadId}
              onChange={(event) => setProjectLeadId(event.target.value)}
              required
              disabled={users.length === 0}
            >
              {users.length === 0 && <option value="">No users available</option>}

              {users.map((user) => (
                <option key={user._id} value={user._id}>
                  {getUserLabel(user)}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={creating || loading || users.length === 0}
          >
            {creating ? "Creating..." : "Create Project"}
          </button>
        </form>
      </div>

      <div className="section-heading">
        <h3>All Projects</h3>
        <button
          type="button"
          className="secondary-button"
          onClick={loadData}
          disabled={loading}
        >
          Refresh Projects
        </button>
      </div>

      {loading ? (
        <p className="empty-state">Loading projects...</p>
      ) : projects.length === 0 ? (
        <p className="empty-state">
          No projects yet. Use the form above to create your first project.
        </p>
      ) : (
        <div className="project-grid">
          {projects.map((project) => (
            <article className="project-card" key={project._id}>
              <div className="project-card-heading">
                <h3>{project.name}</h3>
                <span
                  className={`status-badge status-${String(
                    project.status || "Planning"
                  ).toLowerCase()}`}
                >
                  {project.status}
                </span>
              </div>

              <p className="project-description">
                {project.description || "No description provided."}
              </p>

              <p className="project-lead">
                <strong>Project Lead:</strong>{" "}
                {project.project_lead
                  ? getUserLabel(project.project_lead)
                  : "Lead information unavailable"}
              </p>

              <p className="project-id">
                Project ID: {project._id}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default Projects;
