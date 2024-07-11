import jwt from 'jsonwebtoken';

function authenticationToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).send('Access denied. No token provided.');

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err , user) => {
    if (err) return res.sendStatus(401);
    req.user = user;
    next();
  });
}

export default authenticationToken;