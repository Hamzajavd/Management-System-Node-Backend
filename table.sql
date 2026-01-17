CREATE TABLE IF NOT EXISTS users (
user_id INT PRIMARY KEY AUTO_INCREMENT,
full_name VARCHAR(100) NOT NULL,
email VARCHAR(100) UNIQUE NOT NULL,
password VARCHAR(255) NOT NULL,
role ENUM('admin' , 'player' , 'scout' , 'coach' , 'physio') NOT NULL DEFAULT 'admin',
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB



CREATE TABLE IF NOT EXISTS players (
    player_id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    age INT,
    position VARCHAR(50), 
    jersey_number INT,
    status ENUM('active', 'injured', 'on-loan') DEFAULT 'active',
    added_by INT, 
    FOREIGN KEY (added_by) REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;


CREATE TABLE matches (
    match_id INT AUTO_INCREMENT PRIMARY KEY,
    opponent_team VARCHAR(255) NOT NULL,
    match_date DATETIME NOT NULL,
    venue VARCHAR(255),
    match_type ENUM('Friendly', 'League', 'Cup') DEFAULT 'Friendly',
    status ENUM('Upcoming', 'Live', 'Completed') DEFAULT 'Upcoming'
);


CREATE TABLE match_stats (
    id INT AUTO_INCREMENT PRIMARY KEY,
    match_id INT NOT NULL,
    player_id INT NOT NULL,
    goals INT DEFAULT 0,
    assists INT DEFAULT 0,
    yellow_cards INT DEFAULT 0,
    red_cards INT DEFAULT 0,
    minutes_played INT DEFAULT 0,
    FOREIGN KEY (match_id) REFERENCES matches(id) ON DELETE CASCADE,
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
);