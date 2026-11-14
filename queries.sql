-- Cineplex | Key SQL queries used by the application (SQLite & MySQL compatible)
-- Tables are created in database.sql (CREATE TABLE) and filled with sample data (INSERT).

-- 1. ADD a booking (INSERT)
INSERT INTO bookings (show_id, customer_name, phone, seats) VALUES (1, 'Tasmia Tahsin', '01711000000', 2);
INSERT INTO booking_seats (booking_id, show_id, seat_no, class_id) VALUES (16, 1, 'B1', 2);

-- 2. VIEW bookings (SELECT + JOIN)
SELECT b.booking_id, b.customer_name, m.title, s.hall, s.show_time
FROM bookings b JOIN shows s ON b.show_id = s.show_id JOIN movies m ON s.movie_id = m.movie_id
ORDER BY b.booking_id;

-- 3. SEARCH / FILTER (WHERE + LIKE)
SELECT * FROM bookings WHERE customer_name LIKE '%Noha%' OR phone LIKE '%0171%';
SELECT * FROM bookings WHERE show_id = 3;

-- 4. UPDATE a booking
UPDATE bookings SET customer_name = 'Nusrat J.', phone = '01811000002', seats = 2 WHERE booking_id = 2;

-- 5. DELETE (app asks for confirmation first)
DELETE FROM booking_seats WHERE booking_id = 15;
DELETE FROM bookings      WHERE booking_id = 15;

-- 6. SUMMARY (aggregate functions)
SELECT COUNT(*) AS total_bookings, SUM(seats) AS seats_sold, MAX(seats) AS largest_booking FROM bookings;
SELECT SUM(s.price * c.price_factor) AS revenue
FROM booking_seats bs JOIN shows s ON bs.show_id = s.show_id JOIN seat_classes c ON bs.class_id = c.class_id;
SELECT AVG(t.amt) AS avg_booking_value FROM
  (SELECT bs.booking_id, SUM(s.price * c.price_factor) AS amt
   FROM booking_seats bs JOIN shows s ON bs.show_id = s.show_id JOIN seat_classes c ON bs.class_id = c.class_id
   GROUP BY bs.booking_id) t;
SELECT m.title, SUM(s.price * c.price_factor) AS revenue
FROM booking_seats bs JOIN shows s ON bs.show_id = s.show_id JOIN movies m ON s.movie_id = m.movie_id
JOIN seat_classes c ON bs.class_id = c.class_id GROUP BY m.title ORDER BY revenue DESC;
