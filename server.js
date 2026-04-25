// import express from "express";
// import mysql from "mysql2";
// import cors from "cors";

// const app = express();
// app.use(cors());

// const db = mysql.createConnection({
//     host: "localhost",
//     port: 3306,
//     user: "root",
//     password: "",
//     database: "smart_parking",
   
//   });

// app.get("/users", (req, res) => {
//   db.query("SELECT * FROM users", (err, result) => {
//     if (err) return res.send(err);
//     res.json(result);
//   });
// });

// app.listen(3000, () => console.log("Server running"));

// import express from "express";
// import mysql from "mysql2";
// import cors from "cors";

// const app = express();
// app.use(cors());
// app.use(express.json());

// const db = mysql.createConnection({
//   host: "localhost",
//   port: 3306,
//   user: "root",
//   password: "",
//   database: "smart_parking",
// });

// db.connect((err) => {
//   if (err) {
//     console.log(" DB Connection Failed:", err);
//   } else {
//     console.log("DB Connected");
//   }
// });

// // ================= USERS =================

// // GET USERS
// app.get("/users", (req, res) => {
//   db.query("SELECT * FROM users", (err, result) => {
//     if (err) return res.status(500).json(err);
//     res.json(result);
//   });
// });

// app.get("/vehicle-types", (req, res) => {
//   const sql = "SELECT * FROM vehicle_type";

//   db.query(sql, (err, result) => {
//     if (err) {
//       return res.status(500).json(err);
//     }
//     res.json(result);
//   });
// });

// // CREATE USER
// app.post("/users", (req, res) => {
//   const { full_name, email, password, phone, profile_image } = req.body;

//   const sql = `
//     INSERT INTO users (full_name, email, password, phone, profile_image)
//     VALUES (?, ?, ?, ?, ?)
//   `;

//   db.query(sql, [full_name, email, password, phone, profile_image], (err, result) => {
//     if (err) return res.status(500).json(err);
//     res.json({ message: "User created successfully" });
//   });
// });

// // ================= PARKING SLOTS =================

// // GET ALL SLOTS
// app.get("/slots", (req, res) => {
//   db.query("SELECT * FROM parking_slots", (err, result) => {
//     if (err) return res.status(500).json(err);
//     res.json(result);
//   });
// });

// // ================= BOOKINGS =================

// // CREATE BOOKING
// app.post("/bookings", (req, res) => {
//   const { user_id, slot_id, vehicle_type_id, vehicle_number } = req.body;

//   const sql = `
//     INSERT INTO bookings (user_id, slot_id, vehicle_type_id, vehicle_number)
//     VALUES (?, ?, ?, ?)
//   `;

//   db.query(sql, [user_id, slot_id, vehicle_type_id, vehicle_number], (err, result) => {
//     if (err) return res.status(500).json(err);
//     res.json({ message: "Booking created successfully" });
//   });
// });

// // GET BOOKINGS WITH JOIN
// app.get("/bookings", (req, res) => {
//   const sql = `
//     SELECT b.booking_id, u.full_name, p.slot_number, b.booking_status
//     FROM bookings b
//     JOIN users u ON b.user_id = u.user_id
//     JOIN parking_slots p ON b.slot_id = p.slot_id
//   `;

//   db.query(sql, (err, result) => {
//     if (err) return res.status(500).json(err);
//     res.json(result);
//   });
// });

// // ================= TRANSACTIONS =================

// // CREATE PAYMENT
// app.post("/transactions", (req, res) => {
//   const { booking_id, amount_paid, payment_method } = req.body;

//   const sql = `
//     INSERT INTO transactions (booking_id, amount_paid, payment_method)
//     VALUES (?, ?, ?)
//   `;

//   db.query(sql, [booking_id, amount_paid, payment_method], (err, result) => {
//     if (err) return res.status(500).json(err);
//     res.json({ message: "Payment recorded" });
//   });
// });

// // ================= SERVER =================
// app.listen(3000, () => {
//   console.log("Server running on port 3000");
// });

import express from "express";
import mysql from "mysql2";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

// ================= DATABASE =================
const db = mysql.createConnection({
  host: "localhost",
  port: 3306,
  user: "root",
  password: "",
  database: "smart_parking",
});

db.connect((err) => {
  if (err) {
    console.log("❌ DB Connection Failed:", err);
  } else {
    console.log("✅ DB Connected");
  }
});

// ================= USERS =================

// GET USERS
app.get("/users", (req, res) => {
  db.query("SELECT * FROM users", (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

// CREATE USER
app.post("/users", (req, res) => {
  const { full_name, email, password, phone, profile_image } = req.body;

  const sql = `
    INSERT INTO users (full_name, email, password, phone, profile_image)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(sql, [full_name, email, password, phone, profile_image], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "User created successfully" });
  });
});

// ================= PARKING SLOTS =================

// GET ALL SLOTS
app.get("/slots", (req, res) => {
  db.query("SELECT * FROM parking_slots", (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

// ================= VEHICLE TYPES =================

// ✅ NEW API (IMPORTANT FOR ANDROID SPINNER)
app.get("/vehicle-types", (req, res) => {
  db.query("SELECT * FROM vehicle_type", (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});
// api for past bookings
app.get("/past-bookings/:user_id", (req, res) => {
  const userId = req.params.user_id;

  const sql = `
    SELECT 
      b.booking_id,
      p.slot_number,
      DATE(b.start_time) AS date,
      b.total_hours,
      b.total_amount,
      b.booking_status
    FROM bookings b
    JOIN parking_slots p ON b.slot_id = p.slot_id
    WHERE b.user_id = ? AND b.booking_status = 'completed'
    ORDER BY b.start_time DESC
  `;

  db.query(sql, [userId], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

// ================= BOOKINGS =================

// CREATE BOOKING
app.post("/bookings", (req, res) => {
  const { user_id, slot_id, vehicle_type_id, vehicle_number } = req.body;

  const sql = `
    INSERT INTO bookings (user_id, slot_id, vehicle_type_id, vehicle_number)
    VALUES (?, ?, ?, ?)
  `;

  db.query(sql, [user_id, slot_id, vehicle_type_id, vehicle_number], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Booking created successfully" });
  });
});

// GET BOOKINGS (JOIN)
app.get("/bookings", (req, res) => {
  const sql = `
    SELECT b.booking_id, u.full_name, p.slot_number, b.booking_status
    FROM bookings b
    JOIN users u ON b.user_id = u.user_id
    JOIN parking_slots p ON b.slot_id = p.slot_id
  `;

  db.query(sql, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

// ================= TRANSACTIONS =================

// CREATE PAYMENT
app.post("/transactions", (req, res) => {
  const { booking_id, amount_paid, payment_method } = req.body;

  const sql = `
    INSERT INTO transactions (booking_id, amount_paid, payment_method)
    VALUES (?, ?, ?)
  `;

  db.query(sql, [booking_id, amount_paid, payment_method], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Payment recorded" });
  });
});
app.get("/booking/:id", (req, res) => {
  const id = req.params.id;

  const sql = `
      SELECT 
          booking_id,
          slot,
          date,
          duration,
          amount,
          vehicle_no,
          payment_method
      FROM bookings
      WHERE booking_id = ?
  `;

  db.query(sql, [id], (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result[0]);
  });
});

// ================= SERVER =================
app.listen(3000, () => {
  console.log("🚀 Server running on port 3000");
});