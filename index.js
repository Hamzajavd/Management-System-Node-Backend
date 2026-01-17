

const express = require('express');
const cors = require('cors');
const app = express();
const connection = require('./connection');
const user_Route = require('./routes/user');
const matches_Status = require ('./routes/matches');
const forget_Password = require('./routes/forget_Password');
const match_stats = require('./routes/match-stats');
const player_profile = require('./routes/player_profile')
const path = require('path');
const matches = require('./routes/matches');



app.use(cors());
// app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/uploads', express.static('uploads'));
app.use(express.json({ limit: '50mb' })); 
app.use(express.urlencoded({ limit: '50mb', extended: true }));
// app.use(express.urlencoded({extended:true}));
// app.use(express.json());
app.use('/user', user_Route, forget_Password );
app.use('/match', matches);  
app.use('/match-stats', match_stats);
app.use('/player', player_profile)


module.exports = app