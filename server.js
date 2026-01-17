
require('dotenv').config();

const app = require('./index');
const http = require('http');


const PORT = process.env.PORT || 3000;

const server = http.createServer(app);


server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}).on('error', (err) => {
    console.log("Listen Error:", err);
});