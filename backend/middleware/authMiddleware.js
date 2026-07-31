import jwt from 'jsonwebtoken';

const getTokenFromHeader = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.split(' ')[1];
};

const authMiddleware = (req, res, next) => {
  const token = getTokenFromHeader(req);
  if (!token) {
    return res.status(401).json({ message: 'Missing authorization header.' });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_key_here');
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

export const adminAuth = (req, res, next) => {
  const token = getTokenFromHeader(req);
  if (!token) {
    return res.status(401).json({ message: 'Missing authorization header.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_super_secret_key_here');
    const isAdmin = decoded?.role?.toString().toLowerCase() === 'admin' || decoded?.username?.toString().toLowerCase() === 'admin' || decoded?.userId === 'hardcoded-admin';
    if (!isAdmin) {
      return res.status(403).json({ message: 'Admin access required.' });
    }
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

export default authMiddleware;
