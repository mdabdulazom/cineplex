-- Cineplex Cinema Booking System | DBMS Lab Project
-- MySQL 8 version of the script (CREATE + INSERT). Run: mysql -u root -p < database_mysql.sql
CREATE DATABASE IF NOT EXISTS cineplex;
USE cineplex;
DROP TABLE IF EXISTS booking_seats; DROP TABLE IF EXISTS bookings; DROP TABLE IF EXISTS shows;
DROP TABLE IF EXISTS movies; DROP TABLE IF EXISTS seat_classes; DROP TABLE IF EXISTS genres;

CREATE TABLE genres (
  genre_id   INT AUTO_INCREMENT PRIMARY KEY,
  genre_name VARCHAR(40) NOT NULL UNIQUE
) ENGINE=InnoDB;
CREATE TABLE movies (
  movie_id     INT AUTO_INCREMENT PRIMARY KEY,
  title        VARCHAR(100) NOT NULL,
  duration_min INT NOT NULL CHECK (duration_min > 0),
  genre_id     INT NOT NULL,
  kind         VARCHAR(10) NOT NULL DEFAULT 'Movie' CHECK (kind IN ('Movie','Series')),
  FOREIGN KEY (genre_id) REFERENCES genres(genre_id)
) ENGINE=InnoDB;
CREATE TABLE shows (
  show_id   INT AUTO_INCREMENT PRIMARY KEY,
  movie_id  INT NOT NULL,
  hall      VARCHAR(20) NOT NULL,
  show_time DATETIME NOT NULL,
  price     DECIMAL(8,2) NOT NULL CHECK (price > 0),
  capacity  INT NOT NULL CHECK (capacity > 0),
  FOREIGN KEY (movie_id) REFERENCES movies(movie_id)
) ENGINE=InnoDB;
CREATE TABLE seat_classes (
  class_id     INT AUTO_INCREMENT PRIMARY KEY,
  class_name   VARCHAR(20) NOT NULL UNIQUE,
  price_factor DECIMAL(3,2) NOT NULL CHECK (price_factor > 0)
) ENGINE=InnoDB;
CREATE TABLE bookings (
  booking_id    INT AUTO_INCREMENT PRIMARY KEY,
  show_id       INT NOT NULL,
  customer_name VARCHAR(80) NOT NULL,
  phone         VARCHAR(20) NOT NULL,
  seats         INT NOT NULL CHECK (seats > 0),
  booked_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (show_id) REFERENCES shows(show_id)
) ENGINE=InnoDB;
CREATE TABLE booking_seats (
  booking_id INT NOT NULL,
  show_id    INT NOT NULL,
  seat_no    VARCHAR(5) NOT NULL,
  class_id   INT NOT NULL,
  PRIMARY KEY (booking_id, seat_no),
  UNIQUE (show_id, seat_no),
  FOREIGN KEY (booking_id) REFERENCES bookings(booking_id) ON DELETE CASCADE,
  FOREIGN KEY (show_id)    REFERENCES shows(show_id),
  FOREIGN KEY (class_id)   REFERENCES seat_classes(class_id)
) ENGINE=InnoDB;

-- Standard = base show price, Premium = 1.5 x price (rows A and B)
INSERT INTO seat_classes (class_name,price_factor) VALUES ('Standard',1.0),('Premium',1.5);
INSERT INTO genres (genre_name) VALUES ('Sci-Fi'),('Romance'),('Action'),('Comedy'),('Thriller'),('Crime'),('Fantasy'),('Mystery'),('Horror');
-- duration_min = minutes per episode for series
INSERT INTO movies (title,duration_min,genre_id,kind) VALUES
('Interstellar',169,1,'Movie'),('Titanic',194,2,'Movie'),('All of Us Are Dead',60,9,'Series'),
('Enola Holmes',123,8,'Movie'),('Three Idiots',170,4,'Movie'),
('Dark',60,5,'Series'),('Stranger Things',55,1,'Series'),('Money Heist',70,6,'Series'),('Game of Thrones',60,7,'Series'),('When Life Gives You Tangerines',60,2,'Series');
INSERT INTO shows (movie_id,hall,show_time,price,capacity) VALUES
(1,'Hall A','2026-11-16 18:00:00',450,60),
(2,'Hall B','2026-11-16 20:30:00',350,40),
(3,'Hall A','2026-11-17 15:00:00',400,60),
(4,'Hall C','2026-11-17 19:00:00',500,30),
(5,'Hall B','2026-11-18 17:00:00',300,40),
(6,'Hall C','2026-11-18 21:00:00',350,30),
(7,'Hall A','2026-11-19 18:30:00',300,60),
(8,'Hall B','2026-11-19 20:30:00',300,40),
(9,'Hall C','2026-11-20 19:00:00',350,30),
(10,'Hall A','2026-11-20 21:00:00',350,60);
INSERT INTO bookings (show_id,customer_name,phone,seats) VALUES
(1,'Noha','01711000001',3),(1,'Nusrat Jahan','01811000002',2),
(2,'Adyasha Dash','01911000003',4),(3,'Tasmia Tahsin','01611000004',2),
(3,'Imran Hossain','01511000005',5),(4,'Sneha','01711000006',2),
(4,'Kamal Hasan','01311000007',6),(5,'Tabassum','01411000008',3),
(5,'Arif Chowdhury','01711000009',1),(2,'Emu','01811000010',2),
(6,'Shafin Rahman','01711000011',4),(7,'Israt','01811000012',3),
(8,'Nafis Iqbal','01911000013',5),(9,'Tasnim Jahan','01611000014',2),(10,'Mahir Faisal','01711000015',3);

-- Seat numbers for the sample bookings (A,B = Premium rows)
INSERT INTO booking_seats (booking_id,show_id,seat_no,class_id) VALUES
(1,1,'A1',2),
(1,1,'A2',2),
(1,1,'A3',2),
(2,1,'C1',1),
(2,1,'C2',1),
(3,2,'A1',2),
(3,2,'A2',2),
(3,2,'A3',2),
(3,2,'A4',2),
(4,3,'A1',2),
(4,3,'A2',2),
(5,3,'C1',1),
(5,3,'C2',1),
(5,3,'C3',1),
(5,3,'C4',1),
(5,3,'C5',1),
(6,4,'A1',2),
(6,4,'A2',2),
(7,4,'C1',1),
(7,4,'C2',1),
(7,4,'C3',1),
(7,4,'C4',1),
(7,4,'C5',1),
(7,4,'C6',1),
(8,5,'A1',2),
(8,5,'A2',2),
(8,5,'A3',2),
(9,5,'C1',1),
(10,2,'C1',1),
(10,2,'C2',1),
(11,6,'A1',2),
(11,6,'A2',2),
(11,6,'A3',2),
(11,6,'A4',2),
(12,7,'A1',2),
(12,7,'A2',2),
(12,7,'A3',2),
(13,8,'A1',2),
(13,8,'A2',2),
(13,8,'A3',2),
(13,8,'A4',2),
(13,8,'A5',2),
(14,9,'A1',2),
(14,9,'A2',2),
(15,10,'A1',2),
(15,10,'A2',2),
(15,10,'A3',2);
