const express = require('express');
const router = express.Router();
const db = require('../connection');
const { authenticateToken } = require('../middleware/authentication');
const { checkRole } = require("../middleware/checkRole");
const multer = require('multer');
const path = require('path');
const fs = require('fs')
require('dotenv').config();




router.get('/all-matches', async (req, res) => {
    let connection;
    try {
        connection = await db.getConnection();
        
        // Professional Query: Matches ko date ke hisab se arrange kiya hai
        const [matches] = await connection.execute(
            'SELECT * FROM matches ORDER BY match_date DESC'
        );

        res.status(200).json(matches);
    } catch (error) {
        res.status(500).json({ error:   error.message });
    } finally {
        if (connection) connection.release();
    }
});




const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    // Unique name with original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const  upload = multer({storage: storage});



router.post('/add', 
authenticateToken, checkRole(['admin']), 
upload.single('opponent_team_logo'),
async (req, res) => {
    const { opponent_team, match_date, venue, match_type, status = 'Upcoming' } = req.body;
    const logoPath = req.file ? req.file.filename : null;
    let connection;

    try {
        connection = await db.getConnection();
        await connection.execute(
            'INSERT INTO matches (opponent_team, match_date, venue, match_type, status, opponent_team_logo) VALUES (?,?, ?, ?, ?, ?)',
            [opponent_team, match_date, venue, match_type, status, logoPath]
        );
        res.status(201).json({ message: "Match scheduled successfully!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) connection.release();
    }
});

router.patch('/update', 
    authenticateToken, 
    checkRole(['admin']), 
    upload.single('opponent_team_logo'), // Multer middleware zaroori hai
    async (req, res) => {
        
    const { match_id, opponent_team, match_date, venue, match_type, status } = req.body;
    let connection;

    if (!match_id) {
        return res.status(400).json({ message: "Match ID is required for update" });
    }

    try {
        connection = await db.getConnection();

        // 1. Pehle purani image ka naam nikalne ke liye query karein (optional but good)
        // 2. Check karein ke nayi file upload hui hai ya nahi
        let logoPath;
        if (req.file) {
            logoPath = req.file.filename; // Nayi image select ki gayi hai
        } else {
            // Agar file nahi aayi, toh req.body se purana naam lein (jo frontend bhej raha hai)
            logoPath = req.body.opponent_team_logo; 
        }

        const sql = `
            UPDATE matches 
            SET opponent_team = ?, 
                opponent_team_logo = ?, 
                match_date = ?, 
                venue = ?, 
                match_type = ?, 
                status = ? 
            WHERE match_id = ?`;

        const values = [
            opponent_team, 
            logoPath, // Naya filename ya purana naam
            match_date, 
            venue, 
            match_type, 
            status, 
            match_id
        ];

        const [result] = await connection.execute(sql, values);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Match not found" });
        }

        res.status(200).json({ message: "Match updated successfully!" });

    } catch (error) {
        console.error("Update Error:", error);
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) connection.release();
    }
});

router.patch('/update-status/:id', authenticateToken, checkRole(['admin', 'coach']), async (req, res) => {
    const matchId = req.params.id;
    const { status } = req.body; 

    let connection;
    try {
        connection = await db.getConnection();
        const [result] = await connection.execute(
            'UPDATE matches SET status = ? WHERE match_id = ?',
            [status, matchId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Match nahi mila!" });
        }

        res.status(200).json({ message: `Match status updated to ${status}` });
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) connection.release();
    }
});

router.post('/update-match', async (req, res) => {
    const { match_id, logo_name } = req.body; // logo_name mein 'real_madrid.png' aayega
    try {
        const query = "UPDATE matches SET opponent_team_logo = ? WHERE match_id = ?";
        await db.query(query, [logo_name, match_id]);
        res.json({ message: "Logo updated successfully!" });
    } catch (err) {
        res.status(500).send(err);
    }
});




router.patch('/update-result/:id', authenticateToken, checkRole(['admin', 'coach']), async (req, res) => {
    const matchId = req.params.id;
    const { our_score, opponent_score } = req.body;

    
    if (our_score === undefined || opponent_score === undefined) {
        return res.status(400).json({ message: "Please provide scores for both teams." });
    }

    let connection;
    try {
        connection = await db.getConnection();
        
        
        const [result] = await connection.execute(
            'UPDATE matches SET our_score = ?, opponent_score = ?, status = "Completed" WHERE match_id = ?',
            [our_score, opponent_score, matchId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Match nahi mila!" });
        }

        res.status(200).json({ 
            message: "Match result updated and marked as Completed!",
            score: `${our_score} - ${opponent_score}`
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) connection.release();
    }
});


router.delete('/delete-match/:id',authenticateToken, checkRole(['admin']), async (req, res) => {
 const matchId = req.params.id;

 let connection;
 try{
    connection = await db.getConnection();

    const [matchData] = await connection.execute(
        'Select opponent_team_logo FROM matches where match_id=?',
        [matchId]
    )

    if (matchData.length === 0) {
            return res.status(404).json({ message: "Match nahi mila!" });
        }

        const fileName = matchData[0].opponent_team_logo;


        const [result] = await connection.execute(
            'DELETE FROM matches WHERE match_id = ?',
            [matchId]
        );


        if (result.affectedRows > 0 && fileName) {
            const filePath = path.join(__dirname, '../uploads', fileName); 
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath); 
            }
        }

        res.status(200).json({ message: "Match and logo successfully deleted!" });

 } catch (error) {
        console.error("Delete Error:", error);
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) connection.release();
    }
 
})


module.exports = router;