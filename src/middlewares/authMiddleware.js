// authMiddleware.js
export function authorizeSelf(req, res, next) {

  if (req.user.userId !== req.params.id) {
    return res.status(403).json({ message: 'No autorizado' });
  }
  next();
}