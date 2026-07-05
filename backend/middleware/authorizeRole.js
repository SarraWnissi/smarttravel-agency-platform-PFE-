const authorizeRole = (...roles) => {
  return (req, res, next) => {

    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized (no user)" })
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" })
    }

    next()
  }
}

module.exports = authorizeRole