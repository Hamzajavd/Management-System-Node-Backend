

const mysql = require('mysql2/promise');  
require('dotenv').config();   

const connection = mysql.createPool({
    host: process.env.HOST,
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10, 
    queueLimit: 0
})

connection.getConnection()
    .then(conn => {
        console.log('Database Connected Successfully!');
        conn.release(); 
    })
    .catch(err => {
        console.error('Database Connection Failed!', err.message);
    });

module.exports = connection;