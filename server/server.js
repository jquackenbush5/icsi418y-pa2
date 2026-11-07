
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");

const app = express();
const PORT = 9000;

// Allow React to send JSON and communicate with Express.
app.use(express.json());
app.use(cors());

// Connect using the MongoDB URI in server/.env.
const client = new MongoClient(process.env.MONGO_URI);

// Database collections.
let users;
let projects;
let projectMemberships;
// New for PA4 collection
let userStories;

// Only these three statuses are allowed.
// These are separate from user story statuses.
const VALID_STATUSES = ["Planning", "Active", "Completed"];

// Allowed priorities for PA4 user stories
const VALID_PRIORITIES = ["High", "Medium", "Low"];

// Allowed statuses for PA4 user stories
const VALID_STORY_STATUSES = ["To Do", "In Progress", "Done"];

// Validate MongoDB ObjectId strings before using them in queries.
function isValidObjectId(id) {
  return (
    typeof id === "string" &&
    /^[0-9a-fA-F]{24}$/.test(id) &&
    ObjectId.isValid(id)
  );
}

// Validate user story assignments

// A story is unassigned (null), or assigned to a
// registered user who is a member of the selected project.
async function validateStoryAssignment(projectId, assignedUserId) {

  // null when the story is Unassigned.
  if (assignedUserId === null) {
    return {
      valid: true,
      userId: null,
    };
  }

  // Reject missing, malformed, or non-string identifiers.
  if (!isValidObjectId(assignedUserId)) {
    return {
      valid: false,
      message: "Select a valid project member or Unassigned.",
    };
  }

  // Convert the supplied string into a MongoDB ObjectId.
  const userId = new ObjectId(assignedUserId);

  // Verify that the assigned user is registered.
  const user = await users.findOne({
    _id: userId,
  });

  if (!user) {
    return {
      valid: false,
      message: "The assigned user does not exist.",
    };
  }

  // Verify that the user belongs to this project.
  // Membership in another project is not right here.
  const membership = await projectMemberships.findOne({
    project_id: projectId,
    user_id: userId,
  });

  if (!membership) {
    return {
      valid: false,
      message: "The assigned user is not a member of this project.",
    };
  }

  return {
    valid: true,
    userId: userId,
  };
}

// Return a user's public information without exposing the password.
function publicUser(user) {
  return {
    _id: user._id,
    f_name: user.f_name,
    l_name: user.l_name,
    username: user.username,
  };
}

// --------------------------------------------------
// DATABASE CONNECTION
// --------------------------------------------------

async function connectDatabase() {
  await client.connect();

  console.log("Connected to MongoDB");

  // Using the same database as PA2.
  const db = client.db("pa2");

  // Keep the existing Users collection.
  users = db.collection("users");

  projects = db.collection("Projects");
  projectMemberships = db.collection("ProjectMemberships");

  // For storing individual user stories
  userStories = db.collection("UserStories");

  // Prevent a user from being a member of the same
  // project more than once, including concurrent requests.
  await projectMemberships.createIndex(
    { project_id: 1, user_id: 1 },
    { unique: true }
  );

  console.log("Database collections are ready");
}

// --------------------------------------------------
// GENERAL SERVER ROUTE
// --------------------------------------------------

app.get("/", (req, res) => {
  res.json({
    message: "Server is running",
  });
});

// --------------------------------------------------
// SIGNUP ROUTE - EXISTING PA2 FUNCTIONALITY
// --------------------------------------------------

app.post("/signup", async (req, res) => {
  try {
    const { f_name, l_name, username, password } = req.body;

    if (
      typeof f_name !== "string" || !f_name.trim() ||
      typeof l_name !== "string" || !l_name.trim() ||
      typeof username !== "string" || !username.trim() ||
      typeof password !== "string" || !password
    ) {
      return res.status(400).json({
        message: "All Signup fields are required",
      });
    }

    const existingUser = await users.findOne({
      username: username.trim(),
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Username already exists",
      });
    }

    await users.insertOne({
      f_name: f_name.trim(),
      l_name: l_name.trim(),
      username: username.trim(),
      password: password,
    });

    res.status(201).json({
      message: "User created successfully",
    });
  } catch (error) {
    console.error("Signup error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

// --------------------------------------------------
// LOGIN ROUTE - EXISTING PA2 FUNCTIONALITY
// --------------------------------------------------

app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (
      typeof username !== "string" || !username.trim() ||
      typeof password !== "string" || !password
    ) {
      return res.status(400).json({
        message: "Username and password are required",
      });
    }

    const user = await users.findOne({
      username: username.trim(),
    });

    if (!user || user.password !== password) {
      return res.status(401).json({
        message: "Invalid username or password",
      });
    }

    res.status(200).json({
      message: "Login successful",
    });
  } catch (error) {
    console.error("Login error:", error);

    res.status(500).json({
      message: "Server error",
    });
  }
});

// --------------------------------------------------
// GET REGISTERED USERS
// GET /users
// --------------------------------------------------

app.get("/users", async (req, res) => {
  try {
    // Do not send passwords to the React frontend.
    const registeredUsers = await users
      .find(
        {},
        {
          projection: {
            f_name: 1,
            l_name: 1,
            username: 1,
          },
        }
      )
      .sort({ username: 1 })
      .toArray();

    res.status(200).json(registeredUsers);
  } catch (error) {
    console.error("Get users error:", error);

    res.status(500).json({
      message: "Could not retrieve users",
    });
  }
});

// --------------------------------------------------
// CREATE PROJECT
// POST /projects
// --------------------------------------------------

app.post("/projects", async (req, res) => {
  try {
    const { name, description, status, project_lead_id } = req.body;

    // Validate every required field.
    if (
      typeof name !== "string" || !name.trim() ||
      typeof description !== "string" || !description.trim() ||
      typeof status !== "string" ||
      !VALID_STATUSES.includes(status) ||
      !isValidObjectId(project_lead_id)
    ) {
      return res.status(400).json({
        message:
          "Provide a project name, description, valid status, and valid Project Lead ID",
      });
    }

    // Confirm that the selected lead is registered.
    const lead = await users.findOne({
      _id: new ObjectId(project_lead_id),
    });

    if (!lead) {
      return res.status(404).json({
        message: "The selected Project Lead does not exist",
      });
    }

    // Store the project with an ObjectId reference to its lead.
    const newProject = {
      name: name.trim(),
      description: description.trim(),
      status: status,
      project_lead_id: lead._id,
    };

    const projectResult = await projects.insertOne(newProject);

    // The lead must automatically be a project member.
    try {
      await projectMemberships.insertOne({
        project_id: projectResult.insertedId,
        user_id: lead._id,
      });
    } catch (membershipError) {
      // Avoid leaving a project behind if its initial
      // membership cannot be created.
      await projects.deleteOne({
        _id: projectResult.insertedId,
      });

      throw membershipError;
    }

    res.status(201).json({
      message: "Project created successfully",
      project: {
        _id: projectResult.insertedId,
        ...newProject,
        project_lead: publicUser(lead),
      },
    });
  } catch (error) {
    console.error("Create project error:", error);

    res.status(500).json({
      message: "Could not create project",
    });
  }
});

// --------------------------------------------------
// VIEW ALL PROJECTS WITH PROJECT LEAD INFORMATION
// GET /projects
// --------------------------------------------------

app.get("/projects", async (req, res) => {
  try {
    const projectList = await projects
      .aggregate([
        {
          $lookup: {
            from: "users",
            localField: "project_lead_id",
            foreignField: "_id",
            as: "lead",
          },
        },
        {
          $unwind: {
            path: "$lead",
            preserveNullAndEmptyArrays: true,
          },
        },
        {
          $project: {
            name: 1,
            description: 1,
            status: 1,
            project_lead_id: 1,
            project_lead: {
              _id: "$lead._id",
              f_name: "$lead.f_name",
              l_name: "$lead.l_name",
              username: "$lead.username",
            },
          },
        },
        {
          $sort: { name: 1 },
        },
      ])
      .toArray();

    res.status(200).json(projectList);
  } catch (error) {
    console.error("Get projects error:", error);

    res.status(500).json({
      message: "Could not retrieve projects",
    });
  }
});

// --------------------------------------------------
// VIEW MEMBERS OF A PROJECT
// GET /projects/:id/members
// --------------------------------------------------

app.get("/projects/:id/members", async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid project ID",
      });
    }

    const projectId = new ObjectId(id);

    const project = await projects.findOne({
      _id: projectId,
    });

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    const memberships = await projectMemberships
      .find({ project_id: projectId })
      .toArray();

    // Resolve membership user IDs to actual user documents.
    const memberIds = memberships.map(
      (membership) => membership.user_id
    );

    const memberUsers = await users
      .find({ _id: { $in: memberIds } })
      .project({
        f_name: 1,
        l_name: 1,
        username: 1,
      })
      .toArray();

    const memberMap = new Map(
      memberUsers.map((user) => [user._id.toString(), user])
    );

    const members = memberships
      .map((membership) => {
        const user = memberMap.get(membership.user_id.toString());

        if (!user) {
          return null;
        }

        return {
          membership_id: membership._id,
          ...publicUser(user),
          is_project_lead:
            user._id.equals(project.project_lead_id),
        };
      })
      .filter(Boolean);

    res.status(200).json(members);
  } catch (error) {
    console.error("Get project members error:", error);

    res.status(500).json({
      message: "Could not retrieve project members",
    });
  }
});

// --------------------------------------------------
// ADD A PROJECT MEMBER
// POST /projects/:id/members
// Request body: { "user_id": "MongoDB ObjectId string" }
// --------------------------------------------------

app.post("/projects/:id/members", async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid project ID",
      });
    }

    if (!isValidObjectId(user_id)) {
      return res.status(400).json({
        message: "A valid user ID is required",
      });
    }

    const projectId = new ObjectId(id);
    const userId = new ObjectId(user_id);

    const project = await projects.findOne({
      _id: projectId,
    });

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    const user = await users.findOne({
      _id: userId,
    });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    // Check for an existing relationship before inserting.
    const existingMembership = await projectMemberships.findOne({
      project_id: projectId,
      user_id: userId,
    });

    if (existingMembership) {
      return res.status(409).json({
        message: "This user is already a member of the project",
      });
    }

    await projectMemberships.insertOne({
      project_id: projectId,
      user_id: userId,
    });

    res.status(201).json({
      message: "Member added successfully",
    });
  } catch (error) {
    // The unique index also catches simultaneous duplicate
    // requests that pass the check at almost the same time.
    if (error.code === 11000) {
      return res.status(409).json({
        message: "This user is already a member of the project",
      });
    }

    console.error("Add member error:", error);

    res.status(500).json({
      message: "Could not add project member",
    });
  }
});

// --------------------------------------------------
// REMOVE A PROJECT MEMBER
// DELETE /projects/:id/members/:userId
// --------------------------------------------------

app.delete(
  "/projects/:id/members/:userId",
  async (req, res) => {
    try {
      const { id, userId } = req.params;

      if (!isValidObjectId(id) || !isValidObjectId(userId)) {
        return res.status(400).json({
          message: "Invalid project ID or user ID",
        });
      }

      const projectId = new ObjectId(id);
      const memberId = new ObjectId(userId);

      const project = await projects.findOne({
        _id: projectId,
      });

      if (!project) {
        return res.status(404).json({
          message: "Project not found",
        });
      }

      const user = await users.findOne({
        _id: memberId,
      });

      if (!user) {
        return res.status(404).json({
          message: "User not found",
        });
      }

      // The current project lead must remain a member.
      if (project.project_lead_id.equals(memberId)) {
        return res.status(400).json({
          message: "The Project Lead cannot be removed",
        });
      }

// PA4 Rule: Check for assigned user stories

// Confirm that user is actually a member
// of the selected project.
const existingMembership = await projectMemberships.findOne({
  project_id: projectId,
  user_id: memberId,
});

if (!existingMembership) {
  return res.status(404).json({
    message: "This user is not a member of the project",
  });
}

// Check whether this member still has any stories assigned
// to them in this project.
//
// Do not filter by status.
// Done stories prevent member removal.
const assignedStory = await userStories.findOne({
  project_id: projectId,
  assigned_user_id: memberId,
});

if (assignedStory) {
  return res.status(409).json({
    message:
      "This member still has assigned stories. Reassign, unassign, or delete their stories before removing them from the project.",
  });
}

// Only remove the membership if no assigned stories exist.
const result = await projectMemberships.deleteOne({
  project_id: projectId,
  user_id: memberId,
});

if (result.deletedCount === 0) {
  return res.status(404).json({
    message: "This user is not a member of the project",
  });
}

      res.status(200).json({
        message: "Member removed successfully",
      });
    } catch (error) {
      console.error("Remove member error:", error);

      res.status(500).json({
        message: "Could not remove project member",
      });
    }
  }
);

// User stories and project backlog


// Get all stories for a project
// Get /projects/:id/stories

app.get("/projects/:id/stories", async (req, res) => {
  try {
    const { id } = req.params;

    // Validate the project identifier.
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid project ID",
      });
    }

    const projectId = new ObjectId(id);

    // Confirm that the selected project exists.
    const project = await projects.findOne({
      _id: projectId,
    });

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    // Retrieve ALL stories belonging to this project.
    // This includes To Do, In Progress,
    // and Done stories.
    const stories = await userStories
      .find({ project_id: projectId })
      .sort({ title: 1 })
      .toArray();

    // Collect the IDs of all assigned users.
    const assignedUserIds = stories
      .filter((story) => story.assigned_user_id !== null)
      .map((story) => story.assigned_user_id);

    // Retrieve readable user information for assignments.
    const assignedUsers = assignedUserIds.length > 0
      ? await users
          .find({
            _id: { $in: assignedUserIds },
          })
          .project({
            f_name: 1,
            l_name: 1,
            username: 1,
          })
          .toArray()
      : [];

    // Create a map so each story can find its assigned user.
    const userMap = new Map(
      assignedUsers.map((user) => [
        user._id.toString(),
        publicUser(user),
      ])
    );

    // Attach readable assignment information to each story.
    const responseStories = stories.map((story) => ({
      ...story,
      assigned_member:
        story.assigned_user_id === null
          ? null
          : userMap.get(story.assigned_user_id.toString()) || null,
    }));

    res.status(200).json(responseStories);

  } catch (error) {
    console.error("Get project stories error:", error);

    res.status(500).json({
      message: "Could not retrieve project stories",
    });
  }
});


// Create a user story
// Post /projects/:id/stories

app.post("/projects/:id/stories", async (req, res) => {
  try {
    const { id } = req.params;

    const {
      title,
      description,
      priority,
      assigned_user_id,
    } = req.body;

    // Validate the project identifier.
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid project ID",
      });
    }

    const projectId = new ObjectId(id);

    // Verify that the project exists.
    const project = await projects.findOne({
      _id: projectId,
    });

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    // Validate the required title.
    if (
      typeof title !== "string" ||
      !title.trim()
    ) {
      return res.status(400).json({
        message: "A nonblank story title is required",
      });
    }

    // Validate the required description.
    if (
      typeof description !== "string" ||
      !description.trim()
    ) {
      return res.status(400).json({
        message: "A nonblank story description is required",
      });
    }

    // Validate the priority.
    if (!VALID_PRIORITIES.includes(priority)) {
      return res.status(400).json({
        message: "Priority must be High, Medium, or Low",
      });
    }

    // Validate the assigned user.
    // The frontend must send null for Unassigned.
    const assignment = await validateStoryAssignment(
      projectId,
      assigned_user_id
    );

    if (!assignment.valid) {
      return res.status(400).json({
        message: assignment.message,
      });
    }

    // Construct the document
    // Do not accept project_id or status from the request body.
    const newStory = {
      project_id: projectId,
      title: title.trim(),
      description: description.trim(),
      priority: priority,

      // Every new story starts as To Do.
      status: "To Do",

      // Either a valid member ObjectId or null.
      assigned_user_id: assignment.userId,
    };

    // Store the new story in MongoDB.
    const result = await userStories.insertOne(newStory);

    res.status(201).json({
      message: "User story created successfully",
      story: {
        _id: result.insertedId,
        ...newStory,
      },
    });

  } catch (error) {
    console.error("Create user story error:", error);

    res.status(500).json({
      message: "Could not create user story",
    });
  }
});


// Edit a user story
// Put /projects/:id/stories/:storyId

app.put(
  "/projects/:id/stories/:storyId",
  async (req, res) => {
    try {
      const { id, storyId } = req.params;

      const {
        title,
        description,
        priority,
        status,
        assigned_user_id,
      } = req.body;

      // Validate both identifiers.
      if (
        !isValidObjectId(id) ||
        !isValidObjectId(storyId)
      ) {
        return res.status(400).json({
          message: "Invalid project ID or story ID",
        });
      }

      const projectId = new ObjectId(id);
      const storyObjectId = new ObjectId(storyId);

      // Confirm that the project exists.
      const project = await projects.findOne({
        _id: projectId,
      });

      if (!project) {
        return res.status(404).json({
          message: "Project not found",
        });
      }

      // Locate the story using both identifiers.
      const existingStory = await userStories.findOne({
        _id: storyObjectId,
        project_id: projectId,
      });

      if (!existingStory) {
        return res.status(404).json({
          message: "User story not found in this project",
        });
      }

      // Validate title.
      if (
        typeof title !== "string" ||
        !title.trim()
      ) {
        return res.status(400).json({
          message: "A nonblank story title is required",
        });
      }

      // Validate description.
      if (
        typeof description !== "string" ||
        !description.trim()
      ) {
        return res.status(400).json({
          message: "A nonblank story description is required",
        });
      }

      // Validate priority.
      if (!VALID_PRIORITIES.includes(priority)) {
        return res.status(400).json({
          message: "Priority must be High, Medium, or Low",
        });
      }

      // Validate story status.
      if (!VALID_STORY_STATUSES.includes(status)) {
        return res.status(400).json({
          message: "Status must be To Do, In Progress, or Done",
        });
      }

      // Validate the new assignment.
      const assignment = await validateStoryAssignment(
        projectId,
        assigned_user_id
      );

      if (!assignment.valid) {
        return res.status(400).json({
          message: assignment.message,
        });
      }

      // Update only the editable fields.
      // project_id and _id remain unchanged.
      const updates = {
        title: title.trim(),
        description: description.trim(),
        priority: priority,
        status: status,
        assigned_user_id: assignment.userId,
      };

      const result = await userStories.updateOne(
        {
          _id: storyObjectId,
          project_id: projectId,
        },
        {
          $set: updates,
        }
      );

      // modifiedCount may be zero when
      // the submitted values are unchanged.
      if (result.matchedCount === 0) {
        return res.status(404).json({
          message: "User story not found",
        });
      }

      res.status(200).json({
        message: "User story updated successfully",
      });

    } catch (error) {
      console.error("Update user story error:", error);

      res.status(500).json({
        message: "Could not update user story",
      });
    }
  }
);


// Delete a user story
// Delete /projects/:id/stories/:storyId

app.delete(
  "/projects/:id/stories/:storyId",
  async (req, res) => {
    try {
      const { id, storyId } = req.params;

      // Validate both identifiers.
      if (
        !isValidObjectId(id) ||
        !isValidObjectId(storyId)
      ) {
        return res.status(400).json({
          message: "Invalid project ID or story ID",
        });
      }

      const projectId = new ObjectId(id);
      const storyObjectId = new ObjectId(storyId);

      // Confirm that the project exists.
      const project = await projects.findOne({
        _id: projectId,
      });

      if (!project) {
        return res.status(404).json({
          message: "Project not found",
        });
      }

      // Delete only when the story belongs to this project.
      const result = await userStories.deleteOne({
        _id: storyObjectId,
        project_id: projectId,
      });

      if (result.deletedCount === 0) {
        return res.status(404).json({
          message: "User story not found in this project",
        });
      }

      res.status(200).json({
        message: "User story deleted successfully",
      });

    } catch (error) {
      console.error("Delete user story error:", error);

      res.status(500).json({
        message: "Could not delete user story",
      });
    }
  }
);

// Start server after database initialization

async function startServer() {
  try {
    await connectDatabase();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Could not start server:", error);
    process.exit(1);
  }
}

startServer();