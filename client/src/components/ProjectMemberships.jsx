
// Import React hooks
import { useEffect, useState } from "react";

// Base URL for the Express backend.
const API_URL = "http://localhost:9000";

// Defined ProjectMemberships component.
// Component for users to add registered users to projects,
// view existing project members, and remove members.
function ProjectMemberships() {

  /*
     STATE VARIABLES
  */

  // Store all projects retrieved from the backend.
  const [projects, setProjects] = useState([]);

  // Store all registered users retrieved from the backend.
  const [users, setUsers] = useState([]);

  // Store the users who currently belong to the selected project.
  const [members, setMembers] = useState([]);

  // Store the MongoDB ID of the project currently selected by the user.
  // An empty string means that no project is currently selected.
  const [selectedProjectId, setSelectedProjectId] = useState("");

  // Store the MongoDB ID of the user selected in the add-member dropdown.
  const [selectedUserId, setSelectedUserId] = useState("");

  // Track whether the initial projects and users are being loaded.
  // The initial true value allows the interface to show a loading message.
  const [loading, setLoading] = useState(true);

  // Track whether the membership list is currently being retrieved.
  // Memberships can be refreshed without reloading the entire list
  // of projects and registered users.
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Track whether a membership is currently being added or removed.
  const [saving, setSaving] = useState(false);

  // Store a success message after a membership operation succeeds.
  const [message, setMessage] = useState("");

  // Store error messages caused by validation failures or API requests.
  const [error, setError] = useState("");


  /*
     FORMAT A USER'S DISPLAY NAME

     Helper function to create a readable label for a registered user.
     I reused this for the add-member dropdown and current-member list.
  */
  function getUserLabel(user) {
    // Combine the first and last names into a single string.
    // The || "" expressions prevent missing names from becoming undefined.
    // trim() to remove extra whitespace from the beginning and end.
    const fullName = `${user.f_name || ""} ${user.l_name || ""}`.trim();

    // If the user has a full name, show it along with the username.
    // Otherwise, display only the username.
    return fullName
      ? `${fullName} (@${user.username})`
      : user.username;
  }


  /*
     LOAD INITIAL DATA

     Retrieves the projects and registered users needed to populate
     the dropdowns and manage memberships.
  */
  async function loadInitialData() {
    // Indicate that the initial data is being loaded.
    setLoading(true);

    // Clear any previous error before making new requests.
    setError("");

    try {
      /*
         REQUEST PROJECTS AND USERS CONCURRENTLY

         Promise.all() to allow both fetch requests to run at the same time.
         Wait for both requests to resolve before continuing.

         The first response contains projects.
         The second response contains registered users.
      */
      const [projectsResponse, usersResponse] = await Promise.all([
        fetch(`${API_URL}/projects`),
        fetch(`${API_URL}/users`),
      ]);

      // Convert both response bodies from JSON into JavaScript values.
      const projectsData = await projectsResponse.json();
      const usersData = await usersResponse.json();

      /*
         CHECK THE HTTP RESPONSE STATUS
      */

      // Stop processing if the backend could not return the projects.
      if (!projectsResponse.ok) {
        // Use the backend's error message when available.
        // Otherwise, provide a default message.
        throw new Error(projectsData.message || "Could not load projects.");
      }

      // Stop processing if the backend could not return the users.
      if (!usersResponse.ok) {
        throw new Error(usersData.message || "Could not load users.");
      }

      /*
         VALIDATE THE RETURNED DATA TYPES

         Array.isArray() confirms that the backend returned an array.
         If either response is not an array, use an empty array instead.
      */
      const safeProjects = Array.isArray(projectsData) ? projectsData : [];
      const safeUsers = Array.isArray(usersData) ? usersData : [];

      // Save the validated project and user arrays in React state.
      setProjects(safeProjects);
      setUsers(safeUsers);

      /*
         CHOOSE A PROJECT BY DEFAULT

         Update the selected project ID after retrieving the project list.

         The callback receives the current selection. If that project still
         exists in the refreshed list, preserve the selection.
         Otherwise, select the first available project.

         The optional chaining operator ?. safely accesses _id only when
         the first project exists. The || "" fallback handles an empty list.
      */
      setSelectedProjectId((currentId) => {
        // Check whether the currently selected project still exists.
        const stillExists = safeProjects.some(
          (project) => project._id === currentId
        );

        // Preserve a valid selection or choose the first project.
        // If no projects exist, use an empty string.
        return stillExists
          ? currentId
          : safeProjects[0]?._id || "";
      });

      /*
         CHOOSE A USER BY DEFAULT

         Apply the selection logic to the add-member user dropdown.
         Keep the current selection if the user still exists; otherwise,
         select the first registered user when one is available.
      */
      setSelectedUserId((currentId) => {
        // Determine whether the selected user is still registered.
        const stillExists = safeUsers.some((user) => user._id === currentId);

        // Preserve the selection or choose the first available user.
        // If the user list is empty, clear the selection.
        return stillExists ? currentId : safeUsers[0]?._id || "";
      });
    } catch (err) {
      /*
         HANDLE INITIAL LOADING ERRORS

         Catch network failures, JSON parsing failures, and errors
         thrown by the HTTP status checks.
      */
      setError(
        err.message ||
          "Unable to connect to the backend. Make sure Express is running."
      );
    } finally {
      // Run whether loading succeeds or fails.
      setLoading(false);
    }
  }


  /*
     LOAD PROJECT MEMBERS

     Asynchronous function retrieves the members of one project.
     The project ID determines which membership list the backend returns.
  */
  async function loadMembers(projectId) {
    // If no project has been selected, there is no membership list to load.
    if (!projectId) {
      // Clear any members left over from a previously selected project.
      setMembers([]);

      // Stop this function before sending an unnecessary API request.
      return;
    }

    // Indicate that the selected project's members are being retrieved.
    setLoadingMembers(true);

    // Clear an old error before making the request.
    setError("");

    try {
      /*
         SEND A GET REQUEST FOR THE SELECTED PROJECT'S MEMBERS

         The project ID is included in the URL.
      */
      const response = await fetch(
        `${API_URL}/projects/${projectId}/members`
      );

      // Convert the backend's JSON response into a JavaScript value.
      const data = await response.json();

      // Check whether the backend returned a successful HTTP status.
      if (!response.ok) {
        throw new Error(data.message || "Could not load project members.");
      }

      // Store the returned membership list, or an empty array if invalid.
      setMembers(Array.isArray(data) ? data : []);
    } catch (err) {
      // Clear the member list if the request fails.
      // Prevents an old project's members from remaining displayed
      // when the current project's membership request encounters an error.
      setMembers([]);

      // Save an error message for display in the interface.
      setError(err.message || "Unable to load project members.");
    } finally {
      // Reset the membership-loading indicator regardless of the outcome.
      setLoadingMembers(false);
    }
  }


  /*
     INITIAL COMPONENT EFFECT
  */
  useEffect(() => {
    loadInitialData();
  }, []);


  /*
     PROJECT SELECTION EFFECT

     Effect runs when selectedProjectId changes.
  */
  useEffect(() => {
    loadMembers(selectedProjectId);
  }, [selectedProjectId]);


  /*
     FIND THE SELECTED PROJECT

     find() searches the projects array and returns the first project
     whose MongoDB ID matches selectedProjectId.

     If no project matches, selectedProject is undefined.
     This value is used to display the selected project's details.
  */
  const selectedProject = projects.find(
    (project) => project._id === selectedProjectId
  );


  /*
     CALCULATE AVAILABLE USERS

     A user should not appear in the add-member dropdown if that user
     already belongs to the currently selected project.

     filter() keeps only users who do not match any existing member.
     some() checks whether at least one membership matches the user's ID.

     Result to be a derived array. Result is calculated from users and
     members instead of being stored separately in React state.
  */
  const availableUsers = users.filter(
    (user) => !members.some((member) => member._id === user._id)
  );


  /*
     ADD A MEMBER TO A PROJECT

     Function handles submission of the add-member form.
     It validates the selection, sends a POST request to the backend,
     displays feedback, and refreshes the membership list after success.
  */
  async function handleAddMember(event) {
    // Prevent the browser's default form submission and page reload.
    event.preventDefault();

    // Clear messages from previous operations.
    setMessage("");
    setError("");

    // Make sure a project has been selected.
    if (!selectedProjectId) {
      setError("Please select a project.");

      // Stop before attempting to create a membership.
      return;
    }

    // Make sure a user has been selected.
    if (!selectedUserId) {
      setError("Please select a user to add.");

      // Stop if there is no valid user selection.
      return;
    }

    // Indicate that a membership operation is in progress.
    setSaving(true);

    try {
      /*
         SEND A POST REQUEST TO ADD THE MEMBER

         The selected project's ID identifies the project.
         The POST method asks the backend to create a membership
         between that project and the selected user.
      */
      const response = await fetch(
        `${API_URL}/projects/${selectedProjectId}/members`,
        {
          // POST is used to create a new membership relationship.
          method: "POST",

          // Tell Express that the request body contains JSON.
          headers: {
            "Content-Type": "application/json",
          },

          /*
             Convert the selected user's ID into a JSON request body.

             The backend uses user_id
          */
          body: JSON.stringify({
            user_id: selectedUserId,
          }),
        }
      );

      // Parse the response returned by Express.
      const data = await response.json();

      // Handle unsuccessful HTTP responses.
      if (!response.ok) {
        throw new Error(data.message || "Could not add the member.");
      }

      // Display confirmation that the membership was created successfully.
      setMessage("Member added successfully.");

      /*
         REFRESH THE MEMBERSHIP LIST

         Retrieve the current project's membership list again so the newly
         added user appears and is removed from the available-users dropdown.
      */
      await loadMembers(selectedProjectId);
    } catch (err) {
      // Display the backend's error message or a default error.
      setError(err.message || "An error occurred while adding the member.");
    } finally {
      // Reset the saving state even if the request fails.
      setSaving(false);
    }
  }


  /*
     REMOVE A MEMBER FROM A PROJECT

     Asynchronous function to remove an existing membership.
  */
  async function handleRemoveMember(userId) {
    // Clear feedback from previous membership operations.
    setMessage("");
    setError("");

    // Confirm that a project is selected before attempting removal.
    if (!selectedProjectId) {
      setError("Please select a project.");

      // Stop if there is no selected project.
      return;
    }

    /*
       FIND THE MEMBER TO REMOVE

       Search the current members array for the user whose MongoDB ID
       matches userId. If no member is found, member will be undefined.
    */
    const member = members.find((item) => item._id === userId);

    /*
       PROTECT THE PROJECT LEAD

       The optional chaining operator ?. prevents an error if member
       is undefined.

       If the member is marked as the project lead, stop the operation
       and display an explanatory error message.
    */
    if (member?.is_project_lead) {
      setError("The project lead cannot be removed from the project.");
      return;
    }

    /*
       ASK FOR USER CONFIRMATION

       window.confirm() displays a browser confirmation dialog.
       It returns true if the user confirms and false if the user cancels.

       This gives the user an opportunity to cancel an accidental removal.
    */
    const confirmed = window.confirm(
      "Are you sure you want to remove this member from the project?"
    );

    // Do nothing if the user cancels the confirmation dialog.
    if (!confirmed) {
      return;
    }

    // Indicate that a membership change is in progress.
    setSaving(true);

    try {
      /*
         SEND A DELETE REQUEST

         The URL contains both the selected project ID and the user ID.
         The backend uses these identifiers to locate the membership
         that should be removed.
      */
      const response = await fetch(
        `${API_URL}/projects/${selectedProjectId}/members/${userId}`,
        {
          // DELETE requests ask the backend to remove a resource.
          method: "DELETE",
        }
      );

      // Parse the backend's JSON response.
      const data = await response.json();

      // Check for an unsuccessful HTTP response.
      if (!response.ok) {
        throw new Error(data.message || "Could not remove the member.");
      }

      // Display a confirmation message after successful removal.
      setMessage("Member removed successfully.");

      /*
         REFRESH THE MEMBERSHIP LIST

         Reload the selected project's members so the removed user
         disappears from the current-members list and becomes available
         in the add-member dropdown again.
      */
      await loadMembers(selectedProjectId);
    } catch (err) {
      // Display the error returned by the backend, if available.
      setError(err.message || "An error occurred while removing the member.");
    } finally {
      // Reset the saving state whether removal succeeds or fails.
      setSaving(false);
    }
  }


  /*
     RENDER THE PROJECT MEMBERSHIP INTERFACE

     JSX describes the elements React should display.
     JavaScript expressions inside curly braces allow values and
     conditional logic to determine the rendered content.
  */
  return (
    // Main section containing the project membership management page.
    <section className="feature-page">

      {/* Page title and a brief description of the feature. */}
      <div className="page-heading">
        <h2>Project Memberships</h2>
        <p>Manage which registered users belong to each project.</p>
      </div>


      {/*
         CONDITIONAL FEEDBACK MESSAGES
      */}

      {/* Display the success message when one exists. */}
      {message && <p className="notice success">{message}</p>}

      {/* Display the error message when one exists. */}
      {error && <p className="notice error">{error}</p>}


      {/* Card containing project details and the add-member form. */}
      <div className="content-card">

        {/* Group the project selection label and dropdown together. */}
        <div className="form-group">
          {/* Connect the label to the dropdown using its ID. */}
          <label htmlFor="membership-project">Select Project</label>

          <select
            // Unique ID used by the associated label.
            id="membership-project"

            // Keep the selected dropdown option synchronized with React state.
            value={selectedProjectId}

            /*
               Update the selected project when the dropdown changes.

               Clear old messages because they may relate to the project
               that was selected previously.
            */
            onChange={(event) => {
              setMessage("");
              setError("");
              setSelectedProjectId(event.target.value);
            }}

            /*
               Disable the dropdown while initial data is loading or
               when there are no projects available to select.
            */
            disabled={loading || projects.length === 0}
          >
            {/*
               SHOW A PLACEHOLDER IF THERE ARE NO PROJECTS.
            */}
            {projects.length === 0 && (
              <option value="">No projects available</option>
            )}

            {/*
               POPULATE THE PROJECT DROPDOWN

               map() creates one option for each project.
               Each option uses the project's MongoDB ID as its value
               and displays the project's name to the user.

               The key prop gives React a stable identifier for each item.
            */}
            {projects.map((project) => (
              <option key={project._id} value={project._id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>


        {/*
           SELECTED PROJECT DETAILS

           Render this section only if a matching project was found.
           The selectedProject variable is undefined when no project matches.
        */}
        {selectedProject && (
          <div className="selected-project">

            {/* Display the name of the selected project. */}
            <h3>{selectedProject.name}</h3>

            {/* Display the description or a fallback if it is missing. */}
            <p>
              {selectedProject.description || "No description provided."}
            </p>

            {/*
               PROJECT STATUS BADGE

               Construct a CSS class using the project's status in lowercase.

               If the status is missing or empty, "Planning" is used when
               generating the CSS class name.
            */}
            <span
              className={`status-badge status-${String(
                selectedProject.status || "Planning"
              ).toLowerCase()}`}
            >
              {/* Display the status text returned by the backend. */}
              {selectedProject.status}
            </span>
          </div>
        )}


        {/*
           ADD-MEMBER FORM

           The onSubmit handler validates the selection and sends a request
           to add the selected user to the currently selected project.
        */}
        <form onSubmit={handleAddMember} className="add-member-form">

          {/* Group the user-selection label and dropdown together. */}
          <div className="form-group">
            <label htmlFor="membership-user">Add Registered User</label>

            <select
              // Connect the label to this dropdown.
              id="membership-user"

              // Display the currently selected user's MongoDB ID.
              value={selectedUserId}

              // Update the selected user when the dropdown changes.
              onChange={(event) => setSelectedUserId(event.target.value)}

              /*
                 DISABLE THE USER DROPDOWN WHEN SELECTION IS NOT POSSIBLE

                 The dropdown is disabled when:
                 - Initial data is still loading.
                 - There are no registered users.
                 - No project has been selected.
                 - All registered users already belong to this project.
              */
              disabled={
                loading ||
                users.length === 0 ||
                !selectedProjectId ||
                availableUsers.length === 0
              }
            >
              {/*
                 HANDLE THE EMPTY AVAILABLE-USERS LIST

                 If no eligible users remain then all registered
                 users are already members of the selected project.
              */}
              {availableUsers.length === 0 ? (
                <option value="">All registered users are members</option>
              ) : (
                /*
                   Display each user who is not already a member.

                   Option gets stored in the user's MongoDB ID and
                   displays the formatted name and username from 
                   getUserLabel().
                */
                availableUsers.map((user) => (
                  <option key={user._id} value={user._id}>
                    {getUserLabel(user)}
                  </option>
                ))
              )}
            </select>
          </div>


          {/* Submit the form to add the selected user to the project. */}
          <button
            type="submit"

            /*
               Disable submission while saving, while initial data loads,
               when no project is selected, or when no users can be added.
            */
            disabled={
              saving ||
              loading ||
              !selectedProjectId ||
              availableUsers.length === 0
            }
          >
            {/*
               CHANGE THE BUTTON LABEL WHILE A REQUEST IS IN PROGRESS.

               Show "Please wait..." during an add/remove operation.
               Otherwise, display the normal action label.
            */}
            {saving ? "Please wait..." : "Add Member"}
          </button>
        </form>
      </div>


      {/*
         CURRENT MEMBERS SECTION

         Display the heading for the membership list and a button
         that retrieves the latest members from the backend.
      */}
      <div className="section-heading">
        <h3>
          Current Members

          {/*
             Add the selected project's name to the heading when available.
             The em dash separates the general heading from the project name.
          */}
          {selectedProject ? ` — ${selectedProject.name}` : ""}
        </h3>

        <button
          // Use a regular button so clicking it does not submit the form.
          type="button"

          // Apply the secondary button styles defined in the CSS.
          className="secondary-button"

          // Refresh the membership list for the currently selected project.
          onClick={() => loadMembers(selectedProjectId)}

          /*
             Disable refreshing when a membership request is in progress
             or when there is no selected project.
          */
          disabled={loadingMembers || !selectedProjectId}
        >
          Refresh Members
        </button>
      </div>


      {/*
         CONDITIONAL MEMBERSHIP LIST DISPLAY

         This nested ternary operator determines which content is displayed:

         1. Show a loading message while the initial data or members load.
         2. If no project is selected, ask the user to create one first.
         3. If the selected project has no members, display an empty state.
         4. Otherwise, display the list of current members.
      */}
      {loading || loadingMembers ? (
        // Show this message while retrieving data.
        <p className="empty-state">Loading members...</p>
      ) : !selectedProjectId ? (
        // Explain that a project must be selected before managing memberships.
        <p className="empty-state">
          Create a project before managing project memberships.
        </p>
      ) : members.length === 0 ? (
        // Show this message when no members are returned for the project.
        <p className="empty-state">
          No members were returned for this project.
        </p>
      ) : (
        /*
           MEMBER LIST

           Render one article for each member returned by the backend.
           map() transforms the members array into individual member cards.
        */
        <div className="member-list">
          {members.map((member) => (
            /*
               INDIVIDUAL MEMBER CARD

               Each article displays a user's name and username, along with
               an action or badge depending on whether that user is the
               project's lead.

               membership_id is preferred as the React key when available.
               Otherwise, the user's _id is used as a fallback.
            */
            <article
              className="member-card"
              key={member.membership_id || member._id}
            >

              {/* Display the member's identifying information. */}
              <div className="member-details">

                {/* Display the member's full name and username when available. */}
                <strong>{getUserLabel(member)}</strong>

                {/* Show the account's username separately for clarity. */}
                <span className="member-username">
                  Username: {member.username}
                </span>
              </div>


              {/* Place the project-lead badge or member-removal button here. */}
              <div className="member-actions">

                {/*
                   PROTECT THE PROJECT LEAD IN THE INTERFACE

                   If is_project_lead is true, show a badge instead of
                   a Remove button. This prevents the user from removing
                   the project lead through this particular interface.
                */}
                {member.is_project_lead ? (
                  <span className="lead-badge">Project Lead</span>
                ) : (
                  /*
                     REMOVE MEMBER BUTTON

                     Clicking this button calls handleRemoveMember()
                     and passes the selected member's MongoDB ID.

                     The handler asks for confirmation and sends a DELETE
                     request if the user confirms the operation.
                  */
                  <button
                    // Prevent the button from submitting the add-member form.
                    type="button"

                    // Apply the danger-button CSS styling.
                    className="danger-button"

                    // Remove this member from the selected project.
                    onClick={() => handleRemoveMember(member._id)}

                    // Prevent another membership operation while saving.
                    disabled={saving}
                  >
                    Remove
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default ProjectMemberships;