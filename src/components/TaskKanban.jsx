import React, { useState, useEffect, useCallback } from 'react';
import './TaskKanban.css';

/**
 * TaskKanban Component
 * ==============================================================================
 * 5-stage task workflow kanban board for OpenClaw dashboard.
 * Stages: proposal → deliberation → review → execution → archive
 * 
 * Features:
 * - Drag-and-drop task movement between stages
 * - API integration with task-state-machine module
 * - Real-time updates via WebSocket
 * - Mobile-responsive design
 * 
 * @component
 */

const STAGES = [
  { id: 'proposal', label: 'Proposal', color: '#3498db' },
  { id: 'deliberation', label: 'Deliberation', color: '#9b59b6' },
  { id: 'review', label: 'Review', color: '#f39c12' },
  { id: 'execution', label: 'Execution', color: '#e74c3c' },
  { id: 'archive', label: 'Archive', color: '#27ae60' }
];

export default function TaskKanban({ full = false }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);

  // Fetch tasks from API
  const fetchTasks = useCallback(async () => {
    try {
      const response = await fetch('/api/tasks');
      if (!response.ok) throw new Error('Failed to fetch tasks');
      const data = await response.json();
      setTasks(data.tasks || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching tasks:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Update task stage via API
  const updateTaskStage = async (taskId, newStage) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}/stage`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: newStage })
      });
      
      if (!response.ok) throw new Error('Failed to update task stage');
      
      // Optimistically update local state
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId ? { ...task, stage: newStage } : task
        )
      );
    } catch (err) {
      console.error('Error updating task stage:', err);
      setError(err.message);
      // Revert on error
      fetchTasks();
    }
  };

  // Drag handlers
  const handleDragStart = (e, task) => {
    setDraggedTask(task);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id);
  };

  const handleDragOver = (e, stageId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStage(stageId);
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = async (e, stageId) => {
    e.preventDefault();
    setDragOverStage(null);
    
    if (draggedTask && draggedTask.stage !== stageId) {
      await updateTaskStage(draggedTask.id, stageId);
    }
    
    setDraggedTask(null);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverStage(null);
  };

  // Initial fetch
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // WebSocket connection for real-time updates
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

  // Group tasks by stage
  const tasksByStage = tasks.reduce((acc, task) => {
    const stage = task.stage || 'proposal';
    if (!acc[stage]) acc[stage] = [];
    acc[stage].push(task);
    return acc;
  }, {});

  if (loading) {
    return (
      <div className="task-kanban loading">
        <div className="loading-spinner">Loading tasks...</div>
      </div>
    );
  }

  return (
    <div className={`task-kanban ${full ? 'full-view' : ''}`}>
      <div className="kanban-header">
        <h2>📋 Task Workflow</h2>
        <span className="task-count">{tasks.length} tasks</span>
      </div>

      {error && (
        <div className="error-banner">
          Error: {error}
          <button onClick={fetchTasks}>Retry</button>
        </div>
      )}

      <div className="kanban-board">
        {STAGES.map(stage => (
          <div
            key={stage.id}
            className={`kanban-column ${dragOverStage === stage.id ? 'drag-over' : ''}`}
            onDragOver={(e) => handleDragOver(e, stage.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, stage.id)}
          >
            <div 
              className="column-header"
              style={{ borderTopColor: stage.color }}
            >
              <h3>{stage.label}</h3>
              <span className="column-count">
                {tasksByStage[stage.id]?.length || 0}
              </span>
            </div>

            <div className="column-content">
              {(tasksByStage[stage.id] || []).map(task => (
                <div
                  key={task.id}
                  className="task-card"
                  draggable
                  onDragStart={(e) => handleDragStart(e, task)}
                  onDragEnd={handleDragEnd}
                >
                  <div className="task-card-header">
                    <span className="task-id">#{task.id.slice(-6)}</span>
                    {task.priority && (
                      <span className={`priority priority-${task.priority}`}>
                        {task.priority}
                      </span>
                    )}
                  </div>
                  <h4 className="task-title">{task.title}</h4>
                  {task.description && (
                    <p className="task-description">{task.description}</p>
                  )}
                  <div className="task-meta">
                    {task.assignee && (
                      <span className="assignee">👤 {task.assignee}</span>
                    )}
                    {task.dueDate && (
                      <span className="due-date">
                        📅 {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {task.tags && task.tags.length > 0 && (
                    <div className="task-tags">
                      {task.tags.map(tag => (
                        <span key={tag} className="tag">{tag}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
