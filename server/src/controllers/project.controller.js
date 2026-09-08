/** Returns the project collection placeholder for authorized callers. */
function listProjects(req, res) {
  res.json({ data: [], message: 'Project module is ready for implementation' });
}

export { listProjects };