#!/bin/bash
sed -i 's|<GanttChart projectId={project.id} token={user.username} />|<GanttChart projectId={project.id} token={user.username} userRole={user.role} />|g' src/App.tsx
