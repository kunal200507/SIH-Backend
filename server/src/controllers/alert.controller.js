/** Returns the alert collection placeholder for permitted callers. */
function listAlerts(req, res) {
  res.json({ data: [], message: 'Alert module is ready for implementation' });
}

export { listAlerts };