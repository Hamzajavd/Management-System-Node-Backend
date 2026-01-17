require('dotenv').config();


function checkRole(allowedRoles) {
  return (req, res, next) => {
    
    const userRole = res.locals.role;

    if (allowedRoles.includes(userRole)) {
      next(); 
    } else {
      
      return res.status(403).json({ message: "Access Denied: You don't have permission" });
    }
  };
}

module.exports = { checkRole };