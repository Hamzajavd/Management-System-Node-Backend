const express = require('express');
const router = express.Router();
const db = require('../connection');
const { authenticateToken } = require('../middleware/authentication');
const { checkRole } = require("../middleware/checkRole");
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
require('dotenv').config();

router.post('/register', authenticateToken, checkRole(['admin', 'coach']), async (req, res) => {
    
    const { full_name, email, password, role, age, position, jersey_number } = req.body;
    
   
    const added_by = res.locals.userId || null; 

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        const hashedPassword = await bcrypt.hash(password, 10);

    
        const [userResult] = await connection.execute(
            'INSERT INTO users (full_name, email, password, role) VALUES (?, ?, ?, ?)',
            [full_name || null, email || null, hashedPassword, role || null]
        );

        const newUserId = userResult.insertId;

       
        if (role === 'player') {
            const playerQuery = `
                INSERT INTO players (name, age, position, jersey_number, added_by, user_id) 
                VALUES (?, ?, ?, ?, ?, ?)`;
            
            const playerValues = [
                full_name || null, 
                age || null, 
                position || null, 
                jersey_number || null, 
                added_by, 
                newUserId
            ];

            await connection.execute(playerQuery, playerValues);
        }

        await connection.commit();
        res.status(201).json({ message: `${role} registered successfully!` });

    } catch (error) {
        await connection.rollback();
        console.error("SQL Error:", error);
        res.status(500).json({ error: error.message });
    } finally {
        connection.release();
    }
});







router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    let connection;

    try {
        connection = await db.getConnection();


        const [users] = await connection.execute(
            'SELECT user_id, full_name, email, password, role FROM users WHERE email = ?',
            [email]
        );


        if (users.length === 0) {
            return res.status(401).json({ message: "Invalid email or password" });
        }

        const user = users[0];


        const isMatch = await bcrypt.compare(password, user.password);

        console.log("Is Match Result:", isMatch);

        if (!isMatch) {
            return res.status(401).json({ message: "Invalid email or password" });
        }


        const token = jwt.sign(
            { id: user.user_id, role: user.role }, process.env.ACCESS_TOKEN, // Behtar hai ke ise .env file mein rakhein
            { expiresIn: '24h' }
        );

        console.log(token);


        res.status(200).json({
            message: "Login successful",
            token: token,
            user: {
                id: user.user_id,
                name: user.full_name,
                role: user.role
            }
        });

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ message: "Internal Server Error", error: error.message });
    } finally {
        if (connection) connection.release();
    }
});


router.get('/checkToken', authenticateToken, (req, res) => {
    try {
        // Agar control yahan pohncha hai, toh token valid hai
        return res.status(200).json({ 
            status: true,
            message: "Authorized",
            user: req.user // Frontend ko user ka role aur id wapas mil jayegi
        });
    } catch (error) {
        return res.status(500).json({ message: error.message });
    }
});





router.get('/players', authenticateToken, async (req, res) => {
    let connection;
    try {
        connection = await db.getConnection();
        const userRole = res.locals.role; // Middleware se role uthayien

        let query;
        
        // 1. Agar Admin ya Coach hai toh saari details dikhao (including emails)
        if (userRole === 'admin' || userRole === 'coach') {
            query = `
                SELECT 
                    p.player_id, p.name, p.age, p.position, p.jersey_number, 
                    u1.email AS private_email, 
                    u2.full_name AS added_by
                FROM players p
                JOIN users u1 ON p.user_id = u1.user_id
                JOIN users u2 ON p.added_by = u2.user_id
            `;
        } 
        // 2. Agar Scout ya koi aur hai toh sirf public info dikhao
        else {
            query = `
                SELECT 
                    p.name, p.position, p.jersey_number, p.age
                FROM players p
            `;
        }

        const [players] = await connection.execute(query);
        res.status(200).json(players);

    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) connection.release();
    }
});




router.patch('/update-player/:id', authenticateToken, checkRole(['admin', 'coach']), async (req, res) => {
    const playerId = req.params.id;
    const { name, position, jersey_number, age } = req.body;
    let connection;

    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        
        await connection.execute(
            'UPDATE players SET name = ?, position = ?, jersey_number = ?, age = ? WHERE player_id = ?',
            [name, position, jersey_number, age, playerId]
        );

        
        const [playerRow] = await connection.execute('SELECT user_id FROM players WHERE player_id = ?', [playerId]);
        if (playerRow.length > 0) {
            await connection.execute(
                'UPDATE users SET full_name = ? WHERE user_id = ?',
                [name, playerRow[0].user_id]
            );
        }

        await connection.commit();
        res.status(200).json({ message: "Player updated successfully!" });

    } catch (error) {
        if (connection) await connection.rollback();
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) connection.release();
    }
});


module.exports = router;