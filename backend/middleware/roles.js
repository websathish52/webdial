exports.requireRole = function (role) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
    const allowedRoles = Array.isArray(role) ? role : [role];
    const currentRole = String(req.user.role || '').toLowerCase();
    const normalizedAllowed = allowedRoles.map((r) => String(r || '').toLowerCase());
    if (!normalizedAllowed.includes(currentRole)) return res.status(403).json({ message: 'Forbidden' });
    next();
  };
};
