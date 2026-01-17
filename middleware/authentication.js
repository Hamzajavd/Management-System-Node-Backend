require('dotenv').config();
const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: "Token missing" });
    }

    jwt.verify(token, process.env.ACCESS_TOKEN, (err, decoded) => {
        if (err) {
            console.log("JWT Verify Error:", err.message);
            return res.status(403).json({ message: "Token invalid or expired" });
        }

        // Professional Approach: req.user mein data save karna
        req.user = {
            id: decoded.id,
            role: decoded.role,
            email: decoded.email // Agar aapne token bante waqt email dala tha
        };

        // Aapka purana logic bhi barkarar hai
        res.locals.role = decoded.role;
        res.locals.userId = decoded.id;
        
        next();
    });
}

module.exports = { authenticateToken };