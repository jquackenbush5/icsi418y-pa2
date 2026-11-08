
import { useEffect, useState } from "react";

const API_URL = "http://localhost:9000";

// Available story priorities.
const PRIORITIES = ["High", "Medium", "Low"];

// Available story statuses.
const STORY_STATUSES = ["To Do", "In Progress", "Done"];

function UserStories() {
  // Store all projects returned by the backend.
  const [projects, setProjects] = useState([]);

  // Store the MongoDB ID of the currently selected project.
  const [selectedProjectId, setSelectedProjectId] = useState("");

  // Store the stories belonging to the selected project.
  const [stories, setStories] = useState([]);

  // Store the current members of the selected project.
  const [members, setMembers] = useState([]);

  // Track loading states.
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingStories, setLoadingStories] = useState(false);
  const [saving, setSaving] = useState(false);

  // Store success and error messages.
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Track which story is currently being edited.
  // An empty string denotes that the form is creating a new story.
  const [editingStoryId, setEditingStoryId] = useState("");

  // Form fields shared by the create and edit forms.
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [status, setStatus] = useState("To Do");
  const [assignedUserId, setAssignedUserId] = useState("");

  // Changing this value triggers a fresh backlog request.
  const [refreshVersion, setRefreshVersion] = useState(0);

  // Find the selected project for displaying its name.
  const selectedProject = projects.find(
    (project) => project._id === selectedProjectId
  );

  // Format a user's name and username for dropdowns and story cards.
  function getUserLabel(user) {
    if (!user) {
      return "Unassigned";
    }

    const fullName = `${user.f_name || ""} ${user.l_name || ""}`.trim();

    return fullName
      ? `${fullName} (@${user.username})`
      : user.username || "Unknown user";
  }

  // Clear the story form and return it to create mode.
  function resetForm() {
    setEditingStoryId("");
    setTitle("");
    setDescription("");
    setPriority("Medium");
    setStatus("To Do");
    setAssignedUserId("");
  }

  // Load all projects when the component first appears.
  useEffect(() => {
    // Prevent an outdated request from updating state after unmounting.
    let cancelled = false;

    async function loadProjects() {
      setLoadingProjects(true);
      setError("");

      try {
        const response = await fetch(`${API_URL}/projects`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || "Could not load projects.");
        }

        if (cancelled) {
          return;
        }

        const safeProjects = Array.isArray(data) ? data : [];
        setProjects(safeProjects);

        // Preserve the current project if it still exists.
        // Otherwise, select the first available project.
        setSelectedProjectId((currentId) => {
          const stillExists = safeProjects.some(
            (project) => project._id === currentId
          );

          return stillExists ? currentId : safeProjects[0]?._id || "";
        });
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Unable to load projects.");
        }
      } finally {
        if (!cancelled) {
          setLoadingProjects(false);
        }
      }
    }

    loadProjects();

    return () => {
      cancelled = true;
    };
  }, []);

  // Load stories and members whenever the selected project changes.
  useEffect(() => {
    let cancelled = false;

    async function loadProjectData() {
      // Clear the previous project's data immediately.
      setStories([]);
      setMembers([]);

      if (!selectedProjectId) {
        setLoadingStories(false);
        return;
      }

      setLoadingStories(true);
      setError("");

      try {
        // Retrieve the selected project's stories and members together.
        const [storiesResponse, membersResponse] = await Promise.all([
          fetch(`${API_URL}/projects/${selectedProjectId}/stories`),
          fetch(`${API_URL}/projects/${selectedProjectId}/members`),
        ]);

        const [storiesData, membersData] = await Promise.all([
          storiesResponse.json(),
          membersResponse.json(),
        ]);

        if (!storiesResponse.ok) {
          throw new Error(
            storiesData.message || "Could not load user stories."
          );
        }

        if (!membersResponse.ok) {
          throw new Error(
            membersData.message || "Could not load project members."
          );
        }

        // Ignore responses belonging to a project that is no longer selected.
        if (cancelled) {
          return;
        }

        setStories(Array.isArray(storiesData) ? storiesData : []);
        setMembers(Array.isArray(membersData) ? membersData : []);
      } catch (err) {
        if (!cancelled) {
          setStories([]);
          setMembers([]);
          setError(err.message || "Unable to load project data.");
        }
      } finally {
        if (!cancelled) {
          setLoadingStories(false);
        }
      }
    }

    loadProjectData();

    // Cleanup runs when the project changes or the component unmounts.
    return () => {
      cancelled = true;
    };
  }, [selectedProjectId, refreshVersion]);

  // Handle switching between projects.
  function handleProjectChange(event) {
    const newProjectId = event.target.value;

    // Clear the previous project's information immediately.
    setStories([]);
    setMembers([]);
    resetForm();

    // Clear messages that may relate to the previous project.
    setMessage("");
    setError("");

    setSelectedProjectId(newProjectId);
  }

  // Handle creating a new story or updating an existing story.
  async function handleSubmit(event) {
    event.preventDefault();

    setMessage("");
    setError("");

    // Make sure a project is selected.
    if (!selectedProjectId) {
      setError("Please select a project.");
      return;
    }

    // Validate required text fields.
    if (!title.trim()) {
      setError("Please enter a story title.");
      return;
    }

    if (!description.trim()) {
      setError("Please enter a story description.");
      return;
    }

    // Validate the selected priority.
    if (!PRIORITIES.includes(priority)) {
      setError("Please select a valid priority.");
      return;
    }

    // Validate the status when editing an existing story.
    if (editingStoryId && !STORY_STATUSES.includes(status)) {
      setError("Please select a valid story status.");
      return;
    }

    setSaving(true);

    try {
      // Build the request body.
      const storyData = {
        title: title.trim(),
        description: description.trim(),
        priority,

        // An empty dropdown selection means Unassigned.
        assigned_user_id: assignedUserId || null,
      };

      let url;
      let method;

      if (editingStoryId) {
        // Update an existing story within the selected project.
        url = `${API_URL}/projects/${selectedProjectId}/stories/${editingStoryId}`;
        method = "PUT";

        // Include the selected status when editing.
        storyData.status = status;
      } else {
        // Create a new story within the selected project.
        url = `${API_URL}/projects/${selectedProjectId}/stories`;
        method = "POST";

        // Do not send a status when creating.
        // The backend automatically sets new stories to To Do.
      }

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(storyData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not save the user story.");
      }

      // Display the appropriate success message.
      setMessage(
        editingStoryId
          ? "User story updated successfully."
          : "User story created successfully."
      );

      // Clear the form after a successful operation.
      resetForm();

      // Retrieve the latest stories from the backend.
      setRefreshVersion((current) => current + 1);
    } catch (err) {
      setError(err.message || "An error occurred while saving the story.");
    } finally {
      setSaving(false);
    }
  }

  // Load an existing story's information into the form for editing.
  function handleEditStory(story) {
    setMessage("");
    setError("");

    setEditingStoryId(story._id);
    setTitle(story.title || "");
    setDescription(story.description || "");
    setPriority(story.priority || "Medium");
    setStatus(story.status || "To Do");

    // Convert a null assignment into an empty dropdown selection.
    setAssignedUserId(story.assigned_user_id || "");

    // Scroll the form into view when editing.
    document.getElementById("story-form")?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  // Delete a story after obtaining user confirmation.
  async function handleDeleteStory(storyId) {
    setMessage("");
    setError("");

    const confirmed = window.confirm(
      "Are you sure you want to delete this user story? This action cannot be undone."
    );

    // Stop if the user cancels the confirmation.
    if (!confirmed) {
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(
        `${API_URL}/projects/${selectedProjectId}/stories/${storyId}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not delete the user story.");
      }

      setMessage("User story deleted successfully.");

      // If the deleted story was being edited, clear the form.
      if (editingStoryId === storyId) {
        resetForm();
      }

      // Refresh the selected project's backlog.
      setRefreshVersion((current) => current + 1);
    } catch (err) {
      setError(err.message || "An error occurred while deleting the story.");
    } finally {
      setSaving(false);
    }
  }

  // Cancel editing without sending any changes to the backend.
  function handleCancelEdit() {
    resetForm();
    setMessage("");
    setError("");
  }

  return (
    <section className="feature-page">
      <div className="page-heading">
        <h2>User Stories</h2>
        <p>
          Create, assign, edit, and manage the backlog of each project.
        </p>
      </div>

      {/* Display success and error feedback. */}
      {message && <p className="notice success">{message}</p>}
      {error && <p className="notice error">{error}</p>}

      {/* Project selection and story form. */}
      <div className="content-card">
        <div className="form-group">
          <label htmlFor="stories-project">Select Project</label>

          <select
            id="stories-project"
            value={selectedProjectId}
            onChange={handleProjectChange}
            disabled={loadingProjects || projects.length === 0}
          >
            {projects.length === 0 ? (
              <option value="">No projects available</option>
            ) : (
              projects.map((project) => (
                <option key={project._id} value={project._id}>
                  {project.name}
                </option>
              ))
            )}
          </select>
        </div>

        {selectedProject && (
          <div className="selected-project">
            <h3>{selectedProject.name}</h3>
            <p>
              {selectedProject.description || "No description provided."}
            </p>
            <span
              className={`status-badge status-${String(
                selectedProject.status || "Planning"
              ).toLowerCase()}`}
            >
              {selectedProject.status}
            </span>
          </div>
        )}

        <hr />

        <h3 id="story-form">
          {editingStoryId ? "Edit User Story" : "Create a User Story"}
        </h3>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="story-title">Story Title</label>
            <input
              id="story-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Enter a short story title"
              required
              disabled={!selectedProjectId || saving}
            />
          </div>

          <div className="form-group">
            <label htmlFor="story-description">Story Description</label>
            <textarea
              id="story-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="As a [type of user], I want [goal], so that [benefit]."
              rows="4"
              required
              disabled={!selectedProjectId || saving}
            />
            <small>
              Use the format: As a..., I want..., so that...
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="story-priority">Priority</label>
            <select
              id="story-priority"
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
              disabled={!selectedProjectId || saving}
            >
              {PRIORITIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          {/* New stories always begin with To Do status. */}
          {editingStoryId ? (
            <div className="form-group">
              <label htmlFor="story-status">Status</label>
              <select
                id="story-status"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                disabled={saving}
              >
                {STORY_STATUSES.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <p className="story-default-status">
              New story status: <strong>To Do</strong>
            </p>
          )}

          <div className="form-group">
            <label htmlFor="story-assignee">Assigned Member</label>
            <select
              id="story-assignee"
              value={assignedUserId}
              onChange={(event) => setAssignedUserId(event.target.value)}
              disabled={!selectedProjectId || members.length === 0 || saving}
            >
              <option value="">Unassigned</option>

              {members.map((member) => (
                <option key={member._id} value={member._id}>
                  {getUserLabel(member)}
                  {member.is_project_lead ? " — Project Lead" : ""}
                </option>
              ))}
            </select>

            {selectedProjectId && members.length === 0 && !loadingStories && (
              <small>
                No project members are available. Add members before assigning
                stories.
              </small>
            )}
          </div>

          <div className="story-form-actions">
            <button
              type="submit"
              disabled={!selectedProjectId || saving || loadingProjects}
            >
              {saving
                ? "Saving..."
                : editingStoryId
                  ? "Save Changes"
                  : "Create Story"}
            </button>

            {editingStoryId && (
              <button
                type="button"
                className="secondary-button"
                onClick={handleCancelEdit}
                disabled={saving}
              >
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Backlog heading and refresh control. */}
      <div className="section-heading">
        <h3>
          Project Backlog
          {selectedProject ? ` — ${selectedProject.name}` : ""}
        </h3>

        <button
          type="button"
          className="secondary-button"
          onClick={() => setRefreshVersion((current) => current + 1)}
          disabled={!selectedProjectId || loadingStories}
        >
          Refresh Backlog
        </button>
      </div>

      {/* Display the selected project's stories, including completed stories. */}
      {loadingProjects || loadingStories ? (
        <p className="empty-state">Loading project backlog...</p>
      ) : !selectedProjectId ? (
        <p className="empty-state">
          Create a project before managing user stories.
        </p>
      ) : stories.length === 0 ? (
        <p className="empty-state">
          No user stories have been created for this project yet.
        </p>
      ) : (
        <div className="story-list">
          {stories.map((story) => (
            <article className="story-card" key={story._id}>
              <div className="story-card-heading">
                <h3>{story.title}</h3>

                <div className="story-badges">
                  <span
                    className={`priority-badge priority-${String(
                      story.priority
                    ).toLowerCase()}`}
                  >
                    {story.priority}
                  </span>

                  <span
                    className={`story-status-badge story-status-${String(
                      story.status
                    )
                      .toLowerCase()
                      .replace(/\s+/g, "-")}`}
                  >
                    {story.status}
                  </span>
                </div>
              </div>

              {/* Keep the complete description in the backlog. */}
              <p className="story-description">{story.description}</p>

              <p className="story-assignee">
                <strong>Assigned to:</strong>{" "}
                {story.assigned_member
                  ? getUserLabel(story.assigned_member)
                  : "Unassigned"}
              </p>

              <div className="story-actions">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => handleEditStory(story)}
                  disabled={saving}
                >
                  Edit
                </button>

                <button
                  type="button"
                  className="danger-button"
                  onClick={() => handleDeleteStory(story._id)}
                  disabled={saving}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default UserStories;