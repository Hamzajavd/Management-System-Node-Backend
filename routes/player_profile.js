const express = require('express');
const router = express.Router();
const db = require('../connection');

router.get('/profile/:id', async (req, res) => {
    const playerId = req.params.id;
    let connection;

    try {
        connection = await db.getConnection();

        // 1. Player ki basic info aur total stats
        const [stats] = await connection.execute(`
            SELECT 
                p.name, 
                SUM(ms.goals) as total_goals, 
                SUM(ms.assists) as total_assists,
                COUNT(ms.match_id) as total_matches
            FROM players p
            LEFT JOIN match_stats ms ON p.player_id = ms.player_id
            WHERE p.player_id = ?
            GROUP BY p.player_id
        `, [playerId]);

        // 2. Player ki match-by-match history
        const [history] = await connection.execute(`
            SELECT 
                m.match_date, 
                m.opponent_team, 
                ms.goals, 
                ms.assists
            FROM match_stats ms
            JOIN matches m ON ms.match_id = m.match_id
            WHERE ms.player_id = ?
            ORDER BY m.match_date DESC
        `, [playerId]);

        res.json({ info: stats[0], history: history });
    } catch (error) {
        res.status(500).json({ error: error.message });
    } finally {
        if (connection) connection.release();
    }
});

module.exports = router;