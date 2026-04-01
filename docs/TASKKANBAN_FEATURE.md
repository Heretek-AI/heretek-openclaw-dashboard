# TaskKanban Feature Documentation

> **Feature:** Task State Machine with Kanban Board  
> **Version:** 1.0.0  
> **Location:** `heretek-openclaw-dashboard/src/components/TaskKanban.jsx`  
> **API Server:** `heretek-openclaw-dashboard/src/server/api-server.js`

---

## 1. Feature Overview

The TaskKanban feature provides a visual task management system integrated into the Heretek Control Dashboard. It implements a **5-stage state machine** for tracking tasks through a structured workflow, with real-time updates via WebSocket.

### Key Capabilities

- **Visual Kanban Board** - Drag-and-drop interface for task management
- **State Machine Enforcement** - Validates stage transitions (no skipping stages)
- **Real-time Updates** - WebSocket-based synchronization across clients
- **Task Metadata** - Support for priority, assignee, due dates, and tags
- **Mobile-Responsive Design** - Adapts to different screen sizes

### The 5 Stages

| Stage | Description | Color |
|-------|-------------|-------|
| `proposal` | Initial task creation and submission | Blue (#3498db) |
| `deliberation` | Discussion and refinement phase | Purple (#9b59b6) |
| `review` | Final review before execution | Orange (#f39c12) |
| `execution` | Active work in progress | Red (#e74c3c) |
| `archive` | Completed or archived tasks | Green (#27ae60) |

---

## 2. Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                     Dashboard UI (React)                        │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              TaskKanban Component                       │   │
│  │  • Renders 5-stage Kanban board                         │   │
│  │  • Handles drag-and-drop interactions                   │   │
│  │  • Manages local task state                             │   │
│  └─────────────────────────────────────────────────────────┘   │
│           │                        │                            │
│           │ HTTP REST API          │ WebSocket                  │
│           │ (fetch)                │ (real-time)                │
│           ▼                        ▼                            │
└─────────────────────────────────────────────────────────────────┘
           │                        │
           │                        │
┌──────────▼────────────────────────▼────────────────────────────┐
│                    API Server (Node.js/Express)                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              Task State Machine Endpoints               │   │
│  │  • GET    /api/tasks                                    │   │
│  │  • GET    /api/tasks/:id                                │   │
│  │  • PUT    /api/tasks/:id/stage                          │   │
│  │  • POST   /api/tasks                                    │   │
│  │  • DELETE /api/tasks/:id                                │   │
│  └─────────────────────────────────────────────────────────┘   │
│           │                                                      │
│           ▼                                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              In-Memory Task Store (Map)                 │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **Initial Load** - [`TaskKanban`](../src/components/TaskKanban.jsx:27) component mounts → calls [`fetchTasks()`](../src/components/TaskKanban.jsx:35) → `GET /api/tasks`
2. **Task Movement** - User drags task to new column → [`handleDrop()`](../src/components/TaskKanban.jsx:92) → [`updateTaskStage()`](../src/components/TaskKanban.jsx:51) → `PUT /api/tasks/:id/stage`
3. **Real-time Sync** - [`WebSocket`](../src/components/TaskKanban.jsx:114) receives `task-update` event → triggers [`fetchTasks()`](../src/components/TaskKanban.jsx:35) refresh

### File Structure

| File | Purpose | Size |
|------|---------|------|
| [`TaskKanban.jsx`](../src/components/TaskKanban.jsx) | Main React component | 6,820 bytes |
| [`TaskKanban.css`](../src/components/TaskKanban.css) | Kanban board styles | 5,237 bytes |
| [`api-server.js`](../src/server/api-server.js:691-824) | Task State Machine API | Lines 691-824 |
| [`App.jsx`](../src/App.jsx:89-90) | Tab integration | Lines 89-90 |

---

## 3. API Reference

### 3.1 GET /api/tasks

List all tasks in the system.

**Request:**
```http
GET /api/tasks HTTP/1.1
Host: localhost:3001
```

**Response (200 OK):**
```json
{
  "timestamp": "2026-04-01T12:00:00.000Z",
  "total": 3,
  "tasks": [
    {
      "id": "task-1712001600000-abc123",
      "title": "Implement feature X",
      "description": "Build the new feature",
      "stage": "deliberation",
      "priority": "high",
      "assignee": "alice",
      "dueDate": "2026-04-15T00:00:00.000Z",
      "tags": ["feature", "urgent"],
      "createdAt": "2026-04-01T10:00:00.000Z",
      "updatedAt": "2026-04-01T11:00:00.000Z"
    }
  ]
}
```

---

### 3.2 GET /api/tasks/:id

Get details for a single task.

**Request:**
```http
GET /api/tasks/task-1712001600000-abc123 HTTP/1.1
Host: localhost:3001
```

**Response (200 OK):**
```json
{
  "timestamp": "2026-04-01T12:00:00.000Z",
  "task": {
    "id": "task-1712001600000-abc123",
    "title": "Implement feature X",
    "description": "Build the new feature",
    "stage": "deliberation",
    "priority": "high",
    "assignee": "alice",
    "dueDate": "2026-04-15T00:00:00.000Z",
    "tags": ["feature", "urgent"],
    "createdAt": "2026-04-01T10:00:00.000Z",
    "updatedAt": "2026-04-01T11:00:00.000Z"
  }
}
```

**Response (404 Not Found):**
```json
{
  "error": "Task task-1712001600000-abc123 not found",
  "status": 404
}
```

---

### 3.3 PUT /api/tasks/:id/stage

Update a task's stage (state machine transition).

**Request:**
```http
PUT /api/tasks/task-1712001600000-abc123/stage HTTP/1.1
Host: localhost:3001
Content-Type: application/json

{
  "stage": "review"
}
```

**Response (200 OK):**
```json
{
  "timestamp": "2026-04-01T12:00:00.000Z",
  "task": {
    "id": "task-1712001600000-abc123",
    "title": "Implement feature X",
    "description": "Build the new feature",
    "stage": "review",
    "priority": "high",
    "assignee": "alice",
    "dueDate": "2026-04-15T00:00:00.000Z",
    "tags": ["feature", "urgent"],
    "createdAt": "2026-04-01T10:00:00.000Z",
    "updatedAt": "2026-04-01T12:00:00.000Z"
  }
}
```

**Response (400 Bad Request - Invalid Stage):**
```json
{
  "error": "Invalid stage. Must be one of: proposal, deliberation, review, execution, archive",
  "status": 400
}
```

**Response (400 Bad Request - Stage Skip):**
```json
{
  "error": "Cannot skip stages. Move one stage at a time.",
  "status": 400
}
```

---

### 3.4 POST /api/tasks

Create a new task.

**Request:**
```http
POST /api/tasks HTTP/1.1
Host: localhost:3001
Content-Type: application/json

{
  "title": "New task title",
  "description": "Optional description",
  "priority": "high",
  "assignee": "bob",
  "dueDate": "2026-04-20T00:00:00.000Z",
  "tags": ["bug", "priority"]
}
```

**Response (201 Created):**
```json
{
  "timestamp": "2026-04-01T12:00:00.000Z",
  "task": {
    "id": "task-1712005200000-xyz789",
    "title": "New task title",
    "description": "Optional description",
    "stage": "proposal",
    "priority": "high",
    "assignee": "bob",
    "dueDate": "2026-04-20T00:00:00.000Z",
    "tags": ["bug", "priority"],
    "createdAt": "2026-04-01T12:00:00.000Z",
    "updatedAt": "2026-04-01T12:00:00.000Z"
  }
}
```

**Response (400 Bad Request - Missing Title):**
```json
{
  "error": "Title is required",
  "status": 400
}
```

---

### 3.5 DELETE /api/tasks/:id

Delete a task.

**Request:**
```http
DELETE /api/tasks/task-1712001600000-abc123 HTTP/1.1
Host: localhost:3001
```

**Response (200 OK):**
```json
{
  "timestamp": "2026-04-01T12:00:00.000Z",
  "success": true,
  "deletedTaskId": "task-1712001600000-abc123"
}
```

---

## 4. State Machine Diagram

### Valid Stage Transitions

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  proposal   │ ◄─►│deliberation │ ◄─►│   review    │ ◄─►│  execution  │ ◄─►│   archive   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
     (1)                 (2)                (3)                (4)                (5)
```

### Transition Rules

| From Stage | Valid To Stages |
|------------|-----------------|
| `proposal` | `deliberation` |
| `deliberation` | `proposal`, `review` |
| `review` | `deliberation`, `execution` |
| `execution` | `review`, `archive` |
| `archive` | `execution` |

### Implementation Details

The state machine validation is implemented in [`updateTaskStage()`](../src/server/api-server.js:731):

```javascript
// Validate state transition
const stageOrder = validStages;
const currentIndex = stageOrder.indexOf(task.stage);
const newIndex = stageOrder.indexOf(stage);

// Allow moving forward or backward by one stage at a time
if (Math.abs(newIndex - currentIndex) > 1) {
    this._sendError(res, new Error('Cannot skip stages. Move one stage at a time.'), 400);
    return;
}
```

### Stage Order Reference

```javascript
const STAGES = [
  { id: 'proposal', label: 'Proposal', color: '#3498db' },
  { id: 'deliberation', label: 'Deliberation', color: '#9b59b6' },
  { id: 'review', label: 'Review', color: '#f39c12' },
  { id: 'execution', label: 'Execution', color: '#e74c3c' },
  { id: 'archive', label: 'Archive', color: '#27ae60' }
];
```

Source: [`TaskKanban.jsx:19-25`](../src/components/TaskKanban.jsx:19)

---

## 5. WebSocket Events

### Connection

The TaskKanban component establishes a WebSocket connection on mount:

```javascript
useEffect(() => {
  const ws = new WebSocket(`ws://${window.location.host}/ws`);
  
  ws.onmessage = (event) => {
    try {
      const update = JSON.parse(event.data);
      if (update.type === 'task-update') {
        fetchTasks();
      }
    } catch (e) {
      console.error('WebSocket parse error:', e);
    }
  };

  return () => ws.close();
}, []);
```

Source: [`TaskKanban.jsx:114-129`](../src/components/TaskKanban.jsx:114)

### Event Types

| Event Type | Triggered By | Payload |
|------------|--------------|---------|
| `task-update` | Task created, updated, or deleted | `{ type: 'task-update', taskId: string, stage?: string, action?: string }` |

### Server-Side Event Emission

Events are emitted from the API server when tasks change:

**On Stage Update:**
```javascript
this.emit('task-update', { type: 'task-update', taskId: task.id, stage });
```
Source: [`api-server.js:762`](../src/server/api-server.js:762)

**On Task Creation:**
```javascript
this.emit('task-update', { type: 'task-update', taskId: task.id, action: 'created' });
```
Source: [`api-server.js:796`](../src/server/api-server.js:796)

**On Task Deletion:**
```javascript
this.emit('task-update', { type: 'task-update', taskId: params.id, action: 'deleted' });
```
Source: [`api-server.js:817`](../src/server/api-server.js:817)

### WebSocket Server Integration

The WebSocket server (defined in [`websocket-server.js`](../src/server/websocket-server.js)) broadcasts events to all connected clients when the API server emits them.

---

## 6. Usage Examples

### Using the UI

1. **Access the Kanban Board**
   - Navigate to the Heretek Control Dashboard
   - Click the **"Tasks"** tab in the navigation

2. **Create a Task**
   - Tasks are created via API (see POST example above)
   - New tasks appear in the "Proposal" column

3. **Move a Task**
   - Click and drag a task card to a different column
   - Drop the task in the target stage
   - The UI updates optimistically, then confirms with the server

4. **View Task Details**
   - Each task card shows:
     - Task ID (last 6 characters)
     - Title and description
     - Priority badge
     - Assignee
     - Due date
     - Tags

### Programmatic Usage

**Fetch all tasks:**
```javascript
const response = await fetch('/api/tasks');
const { tasks } = await response.json();
console.log(tasks);
```

**Move a task to the next stage:**
```javascript
const taskId = 'task-1712001600000-abc123';
const response = await fetch(`/api/tasks/${taskId}/stage`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ stage: 'review' })
});
const { task } = await response.json();
```

**Create a new task:**
```javascript
const response = await fetch('/api/tasks', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Fix critical bug',
    description: 'Resolve the production issue',
    priority: 'high',
    assignee: 'engineer-1',
    tags: ['bug', 'production']
  })
});
const { task } = await response.json();
```

**Listen for real-time updates:**
```javascript
const ws = new WebSocket(`ws://${window.location.host}/ws`);

ws.onmessage = (event) => {
  const update = JSON.parse(event.data);
  if (update.type === 'task-update') {
    console.log('Task updated:', update.taskId);
    // Refresh your task list
  }
};
```

---

## 7. Component Props

The [`TaskKanban`](../src/components/TaskKanban.jsx:27) component accepts the following props:

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `full` | boolean | `false` | Enable full-view mode with expanded layout |

**Usage:**
```jsx
// Compact view (default)
<TaskKanban />

// Full-screen view
<TaskKanban full />
```

---

## 8. Error Handling

### Client-Side Errors

The component handles errors gracefully:

- **Network Errors:** Displays error banner with retry button
- **WebSocket Errors:** Logged to console, component continues with polling
- **Drag-and-Drop Errors:** Reverts to server state on failure

### Server-Side Errors

| Status Code | Cause | Response |
|-------------|-------|----------|
| 400 | Invalid stage name | `Invalid stage. Must be one of: proposal, deliberation, review, execution, archive` |
| 400 | Stage skip attempt | `Cannot skip stages. Move one stage at a time.` |
| 400 | Missing title (create) | `Title is required` |
| 404 | Task not found | `Task {id} not found` |

---

## 9. Related Files

- [`../src/components/TaskKanban.jsx`](../src/components/TaskKanban.jsx) - Main component
- [`../src/components/TaskKanban.css`](../src/components/TaskKanban.css) - Styles
- [`../src/server/api-server.js`](../src/server/api-server.js:691) - API endpoints
- [`../src/server/websocket-server.js`](../src/server/websocket-server.js) - WebSocket server
- [`../src/App.jsx`](../src/App.jsx:89) - Tab integration

---

## 10. Future Enhancements

Potential improvements for the TaskKanban feature:

- [ ] Inline task editing
- [ ] Task filtering and search
- [ ] Column collapse/expand
- [ ] Task comments and activity log
- [ ] File attachments
- [ ] Custom stage configuration
- [ ] Bulk operations
- [ ] Export to CSV/JSON
