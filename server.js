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

app.use(cors({ origin: "*" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const db = mysql.createConnection({
  host: "localhost",
  port: 3306,
  user: "root",
  password: "",
  database: "smart_parking",
});

db.connect((err) => {
  if (err) {
    console.log("DB Connection Failed:", err);
  } else {
    console.log("DB Connected to 'smart_parking'");
  }
});

app.get("/", (req, res) => {
  res.send("Smart Parking API is working 🚀");
});

app.post("/login", (req, res) => {
  console.log("Incoming Login Data:", req.body);
  const { username, password } = req.body;

  if (!username || !password) {
    return res.json({ success: false, message: "Missing fields" });
  }

  const sql = `
    SELECT * FROM users 
    WHERE (email = ? OR phone = ?) AND password = ?
  `;

  db.query(sql, [username, username, password], (err, result) => {
    if (err) {
      console.log("DB Error:", err);
      return res.status(500).json({ success: false, message: "Server error" });
    }

    if (result.length > 0) {
      res.json({ success: true, user: result[0] });
    } else {
      res.json({ success: false, message: "Invalid credentials" });
    }
  });
});

app.get("/users", (req, res) => {
  db.query("SELECT * FROM users", (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

app.post("/users", (req, res) => {
  const { full_name, email, password, phone, profile_image } = req.body;

  if (!full_name || !email || !password) {
    return res.json({ success: false, message: "Required fields missing" });
  }

  const sql = `
    INSERT INTO users (full_name, email, password, phone, profile_image)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(sql, [full_name, email, password, phone, profile_image], (err) => {
    if (err) {
      console.log("Insert Error:", err);
      return res.status(500).json({ success: false, message: "User creation failed", error: err });
    }
    res.json({ success: true, message: "User created successfully" });
  });
});

app.get("/slots", (req, res) => {
  db.query("SELECT * FROM parking_slots", (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

app.get("/vehicle-types", (req, res) => {
  db.query("SELECT * FROM vehicle_type", (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

app.post("/book-slot", (req, res) => {
  const { user_id, slot_id, vehicle_type_id, vehicle_number } = req.body;

  const insertQuery = `
    INSERT INTO bookings (user_id, slot_id, vehicle_type_id, vehicle_number, booking_status)
    VALUES (?, ?, ?, ?, 'active')
  `;

  db.query(insertQuery, [user_id, slot_id, vehicle_type_id, vehicle_number], (err, result) => {
    if (err) return res.status(500).json(err);

    const bookingId = result.insertId;

    const fetchQuery = `
      SELECT 
        b.booking_id,
        p.slot_number AS slot,
        b.vehicle_number,
        v.type_name AS vehicle_type,
        v.price_per_hour AS price,
        b.start_time
      FROM bookings b
      JOIN parking_slots p ON b.slot_id = p.slot_id
      JOIN vehicle_type v ON b.vehicle_type_id = v.vehicle_type_id
      WHERE b.booking_id = ?
    `;

    db.query(fetchQuery, [bookingId], (err2, result2) => {
      if (err2) return res.status(500).json(err2);
      res.json(result2[0]);
    });
  });
});

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

app.get("/booking/:id", (req, res) => {
  const id = req.params.id;
  const sql = `
      SELECT booking_id, slot, date, duration, amount, vehicle_no, payment_method
      FROM bookings WHERE booking_id = ?
  `;

  db.query(sql, [id], (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result[0] || {});
  });
});

app.get("/active-booking/:user_id", (req, res) => {
  const userId = req.params.user_id;

  const sql = `
    SELECT 
      b.booking_id,
      p.slot_number AS slot,
      b.vehicle_number,
      v.type_name AS vehicle_type,
      v.price_per_hour AS price,
      b.start_time
    FROM bookings b
    JOIN parking_slots p ON b.slot_id = p.slot_id
    JOIN vehicle_type v ON b.vehicle_type_id = v.vehicle_type_id
    WHERE b.user_id = ? AND b.booking_status = 'active'
    ORDER BY b.start_time DESC
    LIMIT 1
  `;

  db.query(sql, [userId], (err, result) => {
    if (err) return res.status(500).json(err);
    if (result.length === 0) return res.json({ message: "No active booking" });
    
    res.json(result[0]);
  });
});

app.post("/end-booking", (req, res) => {
  const { booking_id, total_hours, total_amount } = req.body;

  const sql = `
    UPDATE bookings 
    SET 
      end_time = NOW(),
      total_hours = ?,
      total_amount = ?,
      booking_status = 'completed'
    WHERE booking_id = ?
  `;

  db.query(sql, [total_hours, total_amount, booking_id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Booking completed successfully" });
  });
});

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

app.post("/transactions", (req, res) => {
  const { booking_id, amount_paid, payment_method } = req.body;

  const sql = `
    INSERT INTO transactions (booking_id, amount_paid, payment_method)
    VALUES (?, ?, ?)
  `;

  db.query(sql, [booking_id, amount_paid, payment_method], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Payment recorded successfully" });
  });
});

app.get("/transaction/:id", (req, res) => {
  const transactionId = req.params.id;

  const sql = `
    SELECT transaction_id, amount_paid 
    FROM transactions 
    WHERE transaction_id = ?
  `;

  db.query(sql, [transactionId], (err, result) => {
    if (err) return res.status(500).json({ success: false, message: "DB error", error: err });

    if (result.length > 0) {
      res.json({ success: true, data: result[0] });
    } else {
      res.json({ success: false, message: "Transaction not found" });
    }
  });
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});