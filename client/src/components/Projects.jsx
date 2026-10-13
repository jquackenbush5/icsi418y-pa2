jsx
// Import React hooks
import { useEffect, useState } from "react";

// Base URL for the Express backend.
const API_URL = "http://localhost:9000";

// Define the Projects component to manage project creation and display.
function Projects() {
  /*
     STATE VARIABLES

     useState to create a piece of state and a setter function for updating it.
     When state changes, React re-renders the component so the interface
     reflects the latest data.

     The value inside useState(...) is the initial state.
  */

  // Store registered users returned by the backend.
  // Users populate the dropdown used to select a project lead.
  const [users, setUsers] = useState([]);

  // Store the projects returned by the backend for display in the project grid.
  const [projects, setProjects] = useState([]);

  // Store the project name entered into the creation form.
  const [name, setName] = useState("");

  // Store the optional project description entered into the form.
  const [description, setDescription] = useState("");

  // Store the selected project status.
  // New projects default to "Planning".
  const [status, setStatus] = useState("Planning");

  // Store the MongoDB _id of the user selected as the project lead.
  // An empty string means that no project lead has been selected.
  const [projectLeadId, setProjectLeadId] = useState("");

  // Track whether users and projects are currently being loaded.
  // The initial true value allows the component to show a loading state
  // before the first request to the backend finishes.
  const [loading, setLoading] = useState(true);

  // Track whether a project creation request is currently in progress.
  // Prevent duplicate submissions.
  const [creating, setCreating] = useState(false);

  // Store a success message to display after an operation succeeds.
  const [message, setMessage] = useState("");

  // Store an error message when validation or a backend request fails.
  const [error, setError] = useState("");


  /*
     FORMAT A USER'S DISPLAY NAME

     Helper function to create a readable label for a user.
     It is used in my project-lead dropdown and project cards.
  */
  function getUserLabel(user) {
    // Combine the first and last names into one string.
    // The || "" expressions prevent missing names from becoming undefined.
    // trim() removes extra whitespace from the beginning and end.
    const fullName = `${user.f_name || ""} ${user.l_name || ""}`.trim();

    // If a full name exists then show it alongside the username.
    // Otherwise fall back to showing only the username.
    return fullName
      ? `${fullName} (@${user.username})`
      : user.username;
  }


  /*
     LOAD USERS AND PROJECTS

     Asynchronous function requests the user list and project list
     from the Express backend.
  */
  async function loadData() {
    // Tell React that data is being loaded.
    setLoading(true);

    // Clear any previous error before attempting another load.
    setError("");

    try {
      /*
         Fetch both endpoints at the same time.

         Promise.all() to wait until both fetch operations settle successfully
         or one rejects. Each fetch returns a Response object.

         First response contains users.
         Second response contains projects.
      */
      const [usersResponse, projectsResponse] = await Promise.all([
        fetch(`${API_URL}/users`),
        fetch(`${API_URL}/projects`),
      ]);

      /*
         Convert the response bodies from JSON into JavaScript values.

         The backend to return JSON, such as arrays of users
         and projects. Could also be an error message.
      */
      const usersData = await usersResponse.json();
      const projectsData = await projectsResponse.json();

      /*
         Check the HTTP status of the users request.
      */
      if (!usersResponse.ok) {
        // Use the backend's error message when available.
        // Otherwise, provide a default error message.
        throw new Error(usersData.message || "Could not load users.");
      }

      // Perform the same HTTP status check for the projects request.
      if (!projectsResponse.ok) {
        throw new Error(projectsData.message || "Could not load projects.");
      }

      /*
         Save the retrieved data in React state.

         Array.isArray() to ensure the state contains an array.
         If the backend returns something other than an array, use []
         to prevent errors when the component attempts to map over the data.
      */
      setUsers(Array.isArray(usersData) ? usersData : []);
      setProjects(Array.isArray(projectsData) ? projectsData : []);

      /*
         SET THE DEFAULT PROJECT LEAD

         If at least one registered user exists, select the first user
         unless the current selection still corresponds to a registered user.

         The functional form of setProjectLeadId receives the previous
         state value. This allows the update to check the latest selection.
      */
      if (Array.isArray(usersData) && usersData.length > 0) {
        setProjectLeadId((currentId) => {
          // Check whether the currently selected user still exists.
          const stillExists = usersData.some(
            (user) => user._id === currentId
          );

          // Keep the existing selection when valid.
          // Otherwise, select the first registered user's MongoDB ID.
          return stillExists ? currentId : usersData[0]._id;
        });
      } else {
        // Clear the selection when there are no registered users.
        setProjectLeadId("");
      }
    } catch (err) {
      /*
         HANDLE LOADING ERRORS

         Catch network failures and errors thrown by the HTTP status
         checks above. Check errors encountered while processing JSON.

         The error message is saved in state so the interface can display it.
      */
      setError(
        err.message ||
          "Unable to connect to the backend. Make sure Express is running."
      );
    } finally {
      // Run whether loading succeeds or fails.
      // This removes the loading state so the interface can update.
      setLoading(false);
    }
  }


  /*
     INITIAL DATA LOADING

     useEffect runs this effect after the component has been.

     Calling loadData() retrieves the initial users and projects.
  */
  useEffect(() => {
    loadData();
  }, []);


  /*
     CREATE A NEW PROJECT

     Function for handling form submission.
     This validates the input, sends a POST request to Express,
     displays feedback, and reloads the project list after success.
  */
  async function handleCreateProject(event) {
    // Prevent the browser's default form submission behavior
    event.preventDefault();

    // Clear old feedback so that messages from previous operations
    // do not remain visible during the new submission.
    setMessage("");
    setError("");

    /*
       CLIENT-SIDE VALIDATION

       trim() for removing leading and trailing whitespace.
       Check to prevent a project name made entirely of spaces
       from being accepted.
    */
    if (!name.trim()) {
      setError("Please enter a project name.");

      // Stop processing because the project name is invalid.
      return;
    }

    // A project must have a selected registered user as its project lead.
    if (!projectLeadId) {
      setError("Please select a registered project lead.");

      // Stop before sending a request to the backend.
      return;
    }

    // Indicate that project creation is in progress.
    // The submit button uses this state to prevent repeated submissions.
    setCreating(true);

    try {
      /*
         SEND THE CREATE-PROJECT REQUEST

         fetch() sends an HTTP POST request to the /projects endpoint.
         POST is used here because the application is creating a new resource.
      */
      const response = await fetch(`${API_URL}/projects`, {
        // Specify that this request creates or submits data.
        method: "POST",

        // Tell Express that the request body contains JSON.
        headers: {
          "Content-Type": "application/json",
        },

        /*
           Convert the project information into a JSON string.

           trim for removing unnecessary
           whitespace around the entered values.

           status for storing the selected project status.

           project_lead_id stores the selected user's MongoDB _id.
           The backend uses this ID to associate the project with a user.
        */
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          status,
          project_lead_id: projectLeadId,
        }),
      });

      // Parse the JSON response returned by the backend.
      const data = await response.json();

      // If Express reports an unsuccessful HTTP status, show its message.
      if (!response.ok) {
        throw new Error(data.message || "Could not create the project.");
      }

      /*
         HANDLE SUCCESS

         Update the success message and reset the form fields.
         React re-renders the interface to reflect these state changes.
      */
      setMessage("Project created successfully.");

      // Clear the project name field after successful creation.
      setName("");

      // Clear the project description field.
      setDescription("");

      // Restore the default status for the next project.
      setStatus("Planning");

      /*
         REFRESH THE DISPLAYED DATA

         Reload users and projects from the backend so the newly created
         project appears in the list without a manual page refresh.

         Awaiting loadData() waits for its loading operation to finish.
      */
      await loadData();
    } catch (err) {
      // Display an error if project creation fails.
      setError(err.message || "An error occurred while creating the project.");
    } finally {
      // Reset the creation state regardless of success or failure.
      setCreating(false);
    }
  }


  /*
     JSX RETURN VALUE

     React components return JSX, which describes the elements that
     React should render on the page.
  */
  return (
    // Main section containing the entire project management interface.
    <section className="feature-page">

      {/* Page title and short explanation of the feature. */}
      <div className="page-heading">
        <h2>Project Management</h2>
        <p>Create projects and assign a registered project lead.</p>
      </div>

      {/*
         CONDITIONAL FEEDBACK MESSAGES

         The CSS classes determine the visual appearance of each message.
      */}

      {/* Show the success message only when one exists. */}
      {message && <p className="notice success">{message}</p>}

      {/* Show the error message only when one exists. */}
      {error && <p className="notice error">{error}</p>}


      {/* Card containing the form used to create a new project. */}
      <div className="content-card">
        <h3>Create a Project</h3>

        {/*
           DISPLAY A WARNING WHEN NO USERS EXIST

           Show this message when the users array is empty and the initial
           loading operation has finished.

           Waiting until loading finishes avoids displaying a misleading
           warning before the backend has had a chance to return the users.
        */}
        {users.length === 0 && !loading && (
          <p className="notice error">
            No registered users were found. Create a user account before
            creating a project.
          </p>
        )}

        {/*
           PROJECT CREATION FORM

           onSubmit calls handleCreateProject when the form is submitted.
           The form can be submitted using the button or the keyboard.
        */}
        <form onSubmit={handleCreateProject}>

          {/* Group the project name label and input together. */}
          <div className="form-group">
            {/* htmlFor connects this label to the input with the matching ID. */}
            <label htmlFor="project-name">Project Name</label>

            <input
              // Unique ID that associates the input with its label.
              id="project-name"

              // Allow the user to enter a single-line text value.
              type="text"

              /*
                 CONTROLLED INPUT

                 The input's displayed value comes from React state.
                 Updating the input calls setName(), which updates that state.
              */
              value={name}

              // Update the project name whenever the user types.
              onChange={(event) => setName(event.target.value)}

              // Display example text while the field is empty.
              placeholder="Enter project name"

              // Ask the browser to require a value before form submission.
              required
            />
          </div>


          {/* Group the project description label and textarea together. */}
          <div className="form-group">
            <label htmlFor="project-description">Description</label>

            <textarea
              // Connect the label to this textarea.
              id="project-description"

              // Display the current description stored in React state.
              value={description}

              // Save the latest text whenever the user edits the description.
              onChange={(event) => setDescription(event.target.value)}

              // Show a hint when no description has been entered.
              placeholder="Describe the project"

              // Display approximately three rows of text initially.
              rows="3"
            />
          </div>


          {/* Group the project status label and dropdown together. */}
          <div className="form-group">
            <label htmlFor="project-status">Status</label>

            <select
              // Connect the label to the dropdown.
              id="project-status"

              // Keep the selected option synchronized with React state.
              value={status}

              // Update the status whenever a different option is selected.
              onChange={(event) => setStatus(event.target.value)}
            >
              {/*
                 AVAILABLE PROJECT STATUSES

                 Each option has a value that is saved in React state
                 and submitted to the backend when the form is sent.
              */}
              <option value="Planning">Planning</option>
              <option value="Active">Active</option>
              <option value="Completed">Completed</option>
            </select>
          </div>


          {/* Group the project lead label and dropdown together. */}
          <div className="form-group">
            <label htmlFor="project-lead">Project Lead</label>

            <select
              // Associate the dropdown with its label.
              id="project-lead"

              // Use the selected user's ID as the dropdown's value.
              value={projectLeadId}

              // Store the ID of the newly selected project lead.
              onChange={(event) => setProjectLeadId(event.target.value)}

              // Require a project lead before allowing form submission.
              required

              /*
                 Disable the dropdown if there are no registered users.
                 This prevents users from selecting a project lead when
                 there are no available accounts to choose from.
              */
              disabled={users.length === 0}
            >
              {/*
                 EMPTY USER LIST

                 If there are no registered users, provide a placeholder
                 option explaining why a project lead cannot be selected.
              */}
              {users.length === 0 && (
                <option value="">No users available</option>
              )}

              {/*
                 POPULATE THE DROPDOWN

                 map() creates one option for every registered user.
                 Each option displays a readable user label and stores
                 that user's MongoDB ID as its value.

                 The key prop gives React a stable identifier for each
                 option. React keeps track of list items between renders.
              */}
              {users.map((user) => (
                <option key={user._id} value={user._id}>
                  {getUserLabel(user)}
                </option>
              ))}
            </select>
          </div>


          {/* Submit button for creating the project. */}
          <button
            // Submitting this button triggers the form's onSubmit handler.
            type="submit"

            /*
               Disable the button when:
               - A project is already being created.
               - The initial data-loading operation is in progress.
               - No registered users are available.

               To prevent invalid or duplicate submissions
            */
            disabled={creating || loading || users.length === 0}
          >
            {/*
               CONDITIONAL BUTTON TEXT

               Display "Creating..." while the request is in progress.
               Otherwise, display the normal submit label.
            */}
            {creating ? "Creating..." : "Create Project"}
          </button>
        </form>
      </div>


      {/*
         PROJECT LIST HEADING AND REFRESH BUTTON

         Introduces the list of existing projects and to have
         a way to retrieve data from the backend.
      */}
      <div className="section-heading">
        <h3>All Projects</h3>

        <button
          // Use a button.
          type="button"

          // Apply the secondary button styling
          className="secondary-button"

          // Reload both users and projects when clicked.
          onClick={loadData}

          // Prevent another refresh while a load is already in progress.
          disabled={loading}
        >
          Refresh Projects
        </button>
      </div>


      {/*
         CONDITIONAL PROJECT DISPLAY

         A nested ternary operator selects which content to display:

         1. If loading is true, show a loading message.
         2. Otherwise, if there are no projects, show an empty-state message.
         3. Otherwise, render the grid of project cards.
      */}
      {loading ? (
        // Display while the backend data is being loaded.
        <p className="empty-state">Loading projects...</p>
      ) : projects.length === 0 ? (
        // Display when loading is complete but no projects exist.
        <p className="empty-state">
          No projects yet. Use the form above to create your first project.
        </p>
      ) : (
        /*
           PROJECT GRID

           When at least one project exists, map() converts the projects
           array into a collection of individual project cards.
        */
        <div className="project-grid">
          {projects.map((project) => (
            /*
               INDIVIDUAL PROJECT CARD

               Each article represents one project.
               The key uses the project's unique MongoDB ID so React can
               identify the card when the list changes.
            */
            <article className="project-card" key={project._id}>

              {/* Display the project name and status in the card heading. */}
              <div className="project-card-heading">
                {/* Read the project name from the backend response. */}
                <h3>{project.name}</h3>

                {/*
                   STATUS BADGE

                   The CSS class includes the lowercase project status.

                   If the status is missing or empty then planning is used
                   when generating the CSS class name.
                */}
                <span
                  className={`status-badge status-${String(
                    project.status || "Planning"
                  ).toLowerCase()}`}
                >
                  {/* Display the project's actual status text. */}
                  {project.status}
                </span>
              </div>


              {/* Display the description, or a fallback if none exists. */}
              <p className="project-description">
                {project.description || "No description provided."}
              </p>


              {/* Display the project lead's name and username when available. */}
              <p className="project-lead">
                {/* Use strong text to emphasize the field label. */}
                <strong>Project Lead:</strong>{" "}

                {/*
                   If the backend returned a project_lead object, format it
                   with getUserLabel(). Otherwise, explain that the lead's
                   information could not be retrieved.

                   The backend must return the populated project_lead object
                   for the name and username to be displayed here.
                */}
                {project.project_lead
                  ? getUserLabel(project.project_lead)
                  : "Lead information unavailable"}
              </p>


              {/* Display the unique MongoDB ID for this project. */}
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

// Export the component so other files can import and render it.
export default Projects;