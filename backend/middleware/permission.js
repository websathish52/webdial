// Gate for sidebar-module-level access (crm, whatsapp, marketing, pbx, etc.)
// Master/SuperAdmin/Admin always pass -- this restricts lower roles based
// on their `permissions` toggle set on the Team & Members page.
exports.requirePermission = function (permKey) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
    const role = String(req.user.role || '').toLowerCase();
    if (['master', 'superadmin', 'admin'].includes(role)) return next();

    const perms = req.user.permissions || {};
    if (!perms[permKey]) {
      return res.status(403).json({ message: `You don't have access to ${permKey}` });
    }
    next();
  };
};

// Gate for specific action-level flags (deleteList, disableExportList, etc.)
exports.requireFlag = function (flagKey) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
    const role = String(req.user.role || '').toLowerCase();
    if (['master', 'superadmin', 'admin'].includes(role)) return next();

    const flags = req.user.flags || {};
    if (!flags[flagKey]) {
      return res.status(403).json({ message: `Action not permitted (${flagKey})` });
    }
    next();
  };
};

// Some flags are "disable" toggles (ON = restrict). Use this when the
// flag semantics are inverted, e.g. disableExportList / disableContactDelete.
exports.blockIfFlag = function (flagKey) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
    const role = String(req.user.role || '').toLowerCase();
    if (['master', 'superadmin', 'admin'].includes(role)) return next();

    const flags = req.user.flags || {};
    if (flags[flagKey]) {
      return res.status(403).json({ message: 'Action not permitted' });
    }
    next();
  };
};