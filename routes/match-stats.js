
const express = require('express');
const router = express.Router();
const db = require('../connection');



router.post('/add', async (req, res) => {
    const { match_id, player_id, goals, assists, yellow_cards, red_cards } = req.body;
    let connection;

    try {
        connection = await db.getConnection();

        const query = `
            INSERT INTO match_stats (match_id, player_id, goals, assists, yellow_cards, red_cards)
            VALUES (?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE 
            goals = VALUES(goals), assists = VALUES(assists), 
            yellow_cards = VALUES(yellow_cards), red_cards = VALUES(red_cards)
        `;

        await connection.execute(query, [match_id, player_id, goals, assists, yellow_cards, red_cards]);

        res.status(200).json({ message: "Player stats update ho gaye!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) connection.release();
    }
});



router.post('/save-bulk-stats', async (req, res) => {
    // team_a_score aur team_b_score ko bhi body mein shamil karein
    const { match_id, our_score, opponent_score, players_stats } = req.body;
    let connection;

    // 1. Basic Validation
    if (!match_id || !Array.isArray(players_stats)) {
        return res.status(400).json({ error: "Match ID aur Players Stats array zaroori hain." });
    }

    try {
        connection = await db.getConnection();
        await connection.beginTransaction();

        // 2. Loop through players
        for (let stat of players_stats) {
            const query = `
                INSERT INTO match_stats (match_id, player_id, goals, assists, yellow_cards, red_cards)
                VALUES (?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE 
                goals = VALUES(goals), 
                assists = VALUES(assists),
                yellow_cards = VALUES(yellow_cards),
                red_cards = VALUES(red_cards)
            `;

            await connection.execute(query, [
                match_id,
                stat.player_id,
                stat.goals || 0,
                stat.assists || 0,
                stat.yellow_cards || 0,
                stat.red_cards || 0
            ]);
        }

        // 3. Match Table ko update karein (Score aur Status)
        const updateMatch = `
    UPDATE matches 
    SET our_score = ?, opponent_score = ?, status = 'Completed' 
    WHERE match_id = ?
`;
        await connection.execute(updateMatch, [our_score || 0, opponent_score || 0, match_id]);

        await connection.commit();
        res.status(200).json({ message: "Match summary aur stats save ho gaye!" });

    } catch (error) {
        if (connection) await connection.rollback();
        console.log("FULL ERROR DETAILS:", error);
        console.error(error);
        res.status(500).json({ error: "Data save karne mein masla hua." });
    } finally {
        if (connection) connection.release();
    }
});



router.get('/match-summary/:id', async (req, res) => {
    const matchId = req.params.id;
    let connection;

    try {
        connection = await db.getConnection();

        // 1. Match ki basic details nikaalein (Score, Teams, Date)
        const [matchDetails] = await connection.execute(
            `SELECT * FROM matches WHERE match_id = ?`,
            [matchId]
        );

        // Agar match nahi mila toh error dein
        if (matchDetails.length === 0) {
            return res.status(404).json({ message: "Match nahi mila!" });
        }

        // 2. Us match ke saare players ke stats aur unke naam nikaalein
        // Hum 'players' table ko join kar rahe hain taake 'player_name' mil sake
        const [playerStats] = await connection.execute(
            `SELECT 
                p.name, 
                ms.goals, 
                ms.assists 
             FROM match_stats ms
             JOIN players p ON ms.player_id = p.player_id
             WHERE ms.match_id = ?`,
            [matchId]
        );

        // Final Response: Dono cheezein ek saath bhej dein
        res.status(200).json({
            match: matchDetails[0],
            stats: playerStats
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Database se summary nikalne mein masla hua." });
    } finally {
        if (connection) connection.release();
    }
});


router.get('/leaderboard', async (req, res) => {
    let connection;
    try {
        connection = await db.getConnection();
        const query = `
          SELECT 
        p.name AS player_name, 
        u.image AS image, 
        SUM(ms.goals) AS total_goals, 
        SUM(ms.assists) AS total_assists
    FROM match_stats ms
    JOIN players p ON ms.player_id = p.player_id
    LEFT JOIN users u ON p.user_id = u.user_id 
    GROUP BY p.player_id, p.name, u.image
    ORDER BY total_goals DESC
    LIMIT 10;
        `;
        const [rows] = await connection.execute(query);
        res.status(200).json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) connection.release();
    }
});




router.get('/latest', async (req, res) => {
    try {
        const query = "SELECT * FROM matches ORDER BY  CASE  WHEN status = 'Live' THEN 1 WHEN status = 'Upcoming' THEN 2  ELSE 3  END ASC,  match_date DESC,  match_id DESC LIMIT 1";
        
            
        const [rows] = await db.query(query);

        if (rows.length > 0) {
            res.json(rows[0]); 
        } else {
            res.json(null); 
        }
    } catch (err) {
        console.error("Database Error:", err);
        res.status(500).json({ error: "Database query failed" });
    }
});


module.exports = router;