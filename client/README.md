# ICSI 418Y – Programming Assignment 4
## Project Management Application with User Stories

### 1. Project Overview

This project is my full-stack project management application developed using React, Vite, Node.js, Express, and MongoDB.

My application allows users to register and log in, create and manage projects, add and remove project members, and manage user stories within individual projects.

PA4 is centered around User Stories feature. Users can create, view, edit, assign, update, and delete user stories associated with specific projects.

### 2. Technologies Used

- **Frontend:** React and Vite
- **Backend:** Node.js and Express
- **Database:** MongoDB Atlas
- **Database Driver:** MongoDB Node.js Driver
- **Programming Languages:** JavaScript, HTML, and CSS
- **Development Environment:** Visual Studio Code
- **Version Control:** Git and GitHub

### 3. Project Structure

The application is organized into separate frontend and backend directories.

icsi418y-pa2/
│
├── client/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Login.jsx
│   │   │   ├── Signup.jsx
│   │   │   ├── Projects.jsx
│   │   │   ├── ProjectMemberships.jsx
│   │   │   └── UserStories.jsx
│   │   │
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.css
│   │   └── main.jsx
│   │
│   └── package.json
│
├── server/
│   ├── server.js
│   ├── .env
│   └── package.json
│
├── .gitignore
└── README.md

### 4. Application Features

#### User Authentication (PA2)

- User registration and account creation.
- User login functionality.
- Required-field validation.
- Duplicate username prevention.
- User information stored in MongoDB.

#### Project Management (PA3)

- Create and manage projects.
- Enter project names and descriptions.
- Select project statuses:
  - Planning
  - Active
  - Completed
- Assign a Project Lead from registered users.
- Store project information in MongoDB.

#### Project Memberships (PA3)

- Add registered users to projects.
- Display current project members.
- Prevent duplicate memberships.
- Automatically include the Project Lead as a project member.
- Prevent removal of the Project Lead.

#### User Stories (PA4)

The User Stories feature allows users to manage project backlogs.

Each user story contains the following fields:

| Field | Description |
| `_id` | Unique MongoDB document identifier |
| `project_id` | ObjectId referencing the associated project |
| `title` | User story title |
| `description` | User story description |
| `priority` | High, Medium, or Low |
| `status` | To Do, In Progress, or Done |
| `assigned_user_id` | ObjectId referencing an assigned user, or null |

User story descriptions follow the required format:

**As a [user], I want [feature], so that [benefit].**

The following functionality is supported:

- Create new user stories.
- View the backlog for a selected project.
- Edit existing user stories.
- Delete user stories with confirmation.
- Change story priorities.
- Update story statuses.
- Assign stories to eligible project members.
- Leave stories unassigned.
- Display all stories, including completed stories.
- Refresh the backlog to retrieve saved information from MongoDB.
- Maintain separate backlogs for different projects.

### 5. Database Structure

The application uses a MongoDB Atlas database named `pa2`.

The database contains four collections:

| Collection | Purpose |
| `users` | Stores registered user accounts |
| `Projects` | Stores project information |
| `ProjectMemberships` | Stores project-to-user membership relationships |
| `UserStories` | Stores project user stories and assignments |

An unassigned story stores `null` in `assigned_user_id`.

### 6. Backend API – User Stories (PA4)

The Express backend provides the following routes for managing user stories.

| HTTP Method | Endpoint | Purpose |
| GET | `/projects/:id/stories` | Retrieve stories for a project |
| POST | `/projects/:id/stories` | Create a new story |
| PUT | `/projects/:id/stories/:storyId` | Update an existing story |
| DELETE | `/projects/:id/stories/:storyId` | Delete a story |

The backend validates incoming requests before modifying the database.

Validation includes:

- Required title and description.
- Valid MongoDB ObjectIds.
- Valid priority values.
- Valid status values.
- Existing project verification.
- Existing user verification.
- Project membership verification for assigned users.

The backend also verifies that a story belongs to the project specified in the request before allowing it to be updated or deleted.

### 7. Project Membership Restrictions (PA4)

A restriction was implemented for project membership management.

A project member cannot be removed while they still have user stories assigned to them within that project.

This restriction applies to stories in all three statuses.

Before removing a member, their assigned stories must be reassigned, unassigned, or deleted.

Assignments belonging to other projects do not prevent removal from the selected project.

The Project Lead also remains protected by the existing PA3 membership restriction.

### 8. Installation and Setup

The following software is required:

- Node.js and npm
- MongoDB Atlas account
- Visual Studio Code or another code editor
- Git

### 9. Environment Configuration

Create a `.env` file inside the `server` directory.

I added a MongoDB Atlas connection string.

The backend uses my `pa2` database.

### 10. Running the Application

The frontend and backend must run separately in two terminal windows.

**Terminal 1 – Backend**

Open a terminal and navigate to the server directory:

Enter the following:
cd server

Start the Express server:

Enter the following:
node server.js

The backend runs on:

```
http://localhost:9000
```

**Terminal 2 – Frontend**

Open another terminal and navigate to the client directory:

Enter the following:
cd client

Start the Vite development server:

Enter the following:
npm run dev

The frontend is available at:

```
http://localhost:5173
```

Open the frontend URL in a web browser to access the application.

### 11. Testing and Verification

I tested each of the following as I added implementations to my PA4.

**User and Project Setup**

- Create at least three registered users.
- Create at least two projects.
- Ensure each project has a Project Lead.
- Add at least one non-lead member to a project.

**User Story Management**

- Create at least five user stories across the two projects.
- Verify all three priority levels: High, Medium, and Low.
- Verify all three statuses: To Do, In Progress, and Done.
- Verify both assigned and unassigned stories.
- Edit an existing user story.
- Change an existing story's priority and status.
- Delete a user story using the confirmation prompt.
- Refresh the browser and verify that stories remain saved.

**Project Assignment Validation**

- Verify that the Project Lead can be assigned a story.
- Verify that another project member can be assigned a story.
- Verify that a nonmember cannot be assigned a story.
- Verify that unassigned stories are supported.
- Verify that switching projects displays only the selected project's backlog.

**Membership Removal Validation**

- Attempt to remove a member who has assigned stories.
- Verify that the backend rejects the removal.
- Reassign, unassign, or delete the member's assigned stories.
- Attempt removal again and verify that it succeeds when no assignments remain.
- Verify that Done stories also prevent member removal.
- Verify that assignments in another project do not prevent removal from the selected project.

**Database Verification**

Use MongoDB Atlas to verify that:

- The `UserStories` collection contains the created stories.
- Each story contains the correct project ObjectId.
- Assigned users are stored using ObjectIds.
- Unassigned stories contain a `null` assigned user ID.
- Story updates and deletions persist in the database.

### 12. Error Handling

The application includes validation and error handling on both the frontend and backend.

Users receive feedback when required information is missing, an invalid assignment is attempted, or an operation cannot be completed.

The backend independently validates incoming requests.

### 13. Version Control

The project uses Git and GitHub for version control.

My repository is available at:

https://github.com/jquackenbush5/icsi418y-pa2

To stage the updated project:

Enter the following:
git add .


Commit the PA4 changes:

Enter the following:
git commit -m "Complete PA4 user stories functionality"


Push the changes to GitHub:

Enter the following:
git push origin main



# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.
