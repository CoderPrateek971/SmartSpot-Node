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
  res.send("Smart Parking API is working");
});

app.post("/login", (req, res) => {
  const { username, password, isAdminMode } = req.body;

  if (!username || !password) {
    return res.json({ success: false, message: "Missing fields" });
  }

  // Choose table based on the toggle state from Android
  const table = isAdminMode ? "admin" : "users";
  
  // Use 'email' for admin check or (email/phone) for user check
  const sql = isAdminMode 
    ? `SELECT * FROM admin WHERE email = ? AND password = ?`
    : `SELECT * FROM users WHERE (email = ? OR phone = ?) AND password = ?`;

  const params = isAdminMode 
    ? [username, password] 
    : [username, username, password];

  db.query(sql, params, (err, result) => {
    if (err) {
      console.error("DB Error:", err);
      return res.status(500).json({ success: false, message: "Server error" });
    }

    if (result.length > 0) {
      const user = result[0];
      // Standardize the ID field name for Android
      const userId = isAdminMode ? user.admin_id : user.user_id;
      
      res.json({ 
        success: true, 
        user: { ...user, user_id: userId } 
      });
    } else {
      res.json({ success: false, message: "Invalid email or password" });
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
  const sql = `INSERT INTO users (full_name, email, password, phone, profile_image) VALUES (?, ?, ?, ?, ?)`;
  db.query(sql, [full_name, email, password, phone, profile_image], (err) => {
    if (err) return res.status(500).json({ success: false, message: "User creation failed", error: err });
    res.json({ success: true, message: "User created successfully" });
  });
});

app.post("/updateProfile", (req, res) => {
  const { user_id, full_name, email, password, phone } = req.body;
  if (!user_id) return res.json({ success: false, message: "User ID missing" });
  let sql, values;
  if (password && password.trim() !== "") {
    sql = `UPDATE users SET full_name = ?, email = ?, password = ?, phone = ? WHERE user_id = ?`;
    values = [full_name, email, password, phone, user_id];
  } else {
    sql = `UPDATE users SET full_name = ?, email = ?, phone = ? WHERE user_id = ?`;
    values = [full_name, email, phone, user_id];
  }
  db.query(sql, values, (err) => {
    if (err) return res.status(500).json({ success: false, message: "Update failed" });
    res.json({ success: true, message: "Profile updated successfully" });
  });
});


// ================= SLOTS =================

app.get("/slots", (req, res) => {
  db.query("SELECT * FROM parking_slots", (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

// For Admin: Fetch ALL slots and map parking_status to isActive
app.get("/slots/all", (req, res) => {
  db.query("SELECT * FROM parking_slots", (err, result) => {
    if (err) return res.status(500).json(err);
    
    // Map database fields to standard names for Android
    const formattedResult = result.map(slot => ({
      slot_id: slot.slot_id,
      slot_number: slot.slot_number,
      status: slot.status,
      isActive: slot.parking_status === 'open' ? 1 : 0
    }));

    res.json(formattedResult);
  });
});

// For Admin: Toggle slot enable/disable
app.post("/slots/update-status", (req, res) => {
  const { slot_id, isActive } = req.body;

  if (slot_id === undefined || isActive === undefined) {
    return res.status(400).json({ error: "Missing slot_id or isActive" });
  }

  // If isActive is 1, set to 'open'. If 0, set to 'closed'
  const parkingStatus = isActive === 1 ? 'open' : 'closed';
  const sql = "UPDATE parking_slots SET parking_status = ? WHERE slot_id = ?";

  db.query(sql, [parkingStatus, slot_id], (err, result) => {
    if (err) return res.status(500).json({ error: "Database update failed", details: err });
    res.json({ success: true, message: "Slot status updated" });
  });
});

app.get("/slots/available", (req, res) => {
  // Logic: only show slots that are 'available' AND not closed by admin
  const sql = "SELECT * FROM parking_slots WHERE status = 'available' AND parking_status = 'open'";
  db.query(sql, (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});


// ================= BOOKING =================

app.get("/vehicle-types", (req, res) => {
  db.query("SELECT * FROM vehicle_type", (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

app.post("/book-slot", (req, res) => {
  const { user_id, slot_id, vehicle_type_id, vehicle_number } = req.body;
  db.beginTransaction((err) => {
    if (err) return res.status(500).json({ error: "Transaction failed" });
    const insertQuery = `INSERT INTO bookings (user_id, slot_id, vehicle_type_id, vehicle_number, booking_status) VALUES (?, ?, ?, ?, 'active')`;
    db.query(insertQuery, [user_id, slot_id, vehicle_type_id, vehicle_number], (err1, result) => {
      if (err1) return db.rollback(() => res.status(500).json({ error: "Booking insertion failed", details: err1 }));
      const bookingId = result.insertId;
      const updateSlotQuery = `UPDATE parking_slots SET status = 'occupied' WHERE slot_id = ?`;
      db.query(updateSlotQuery, [slot_id], (err2) => {
        if (err2) return db.rollback(() => res.status(500).json({ error: "Slot update failed", details: err2 }));
        db.commit((err3) => {
          if (err3) return db.rollback(() => res.status(500).json(err3));
          const fetchQuery = `SELECT b.booking_id, p.slot_number AS slot, b.vehicle_number, v.type_name AS vehicle_type, v.price_per_hour AS price, b.start_time FROM bookings b JOIN parking_slots p ON b.slot_id = p.slot_id JOIN vehicle_type v ON b.vehicle_type_id = v.vehicle_type_id WHERE b.booking_id = ?`;
          db.query(fetchQuery, [bookingId], (err4, result2) => {
            if (err4) return res.status(500).json(err4);
            res.json(result2[0]);
          });
        });
      });
    });
  });
});

app.get("/active-booking/:user_id", (req, res) => {
  const userId = req.params.user_id;
  const sql = `SELECT b.booking_id, p.slot_number AS slot, b.vehicle_number, v.type_name AS vehicle_type, v.price_per_hour AS price, b.start_time FROM bookings b JOIN parking_slots p ON b.slot_id = p.slot_id JOIN vehicle_type v ON b.vehicle_type_id = v.vehicle_type_id WHERE b.user_id = ? AND b.booking_status = 'active' ORDER BY b.start_time DESC LIMIT 1`;
  db.query(sql, [userId], (err, result) => {
    if (err) return res.status(500).json(err);
    if (result.length === 0) return res.json({ message: "No active booking" });
    res.json(result[0]);
  });
});

app.post("/end-booking", (req, res) => {
  const { booking_id, total_hours, total_amount } = req.body;
  db.query("SELECT slot_id FROM bookings WHERE booking_id = ?", [booking_id], (err, rows) => {
    if (err || rows.length === 0) return res.status(500).json({ error: "Booking not found" });
    const slot_id = rows[0].slot_id;
    const sql = `UPDATE bookings SET end_time = NOW(), total_hours = ?, total_amount = ?, booking_status = 'completed' WHERE booking_id = ?`;
    db.query(sql, [total_hours, total_amount, booking_id], (err2) => {
      if (err2) return res.status(500).json(err2);
      db.query("UPDATE parking_slots SET status = 'available' WHERE slot_id = ?", [slot_id], (err3) => {
        res.json({ message: "Booking completed and slot freed" });
      });
    });
  });
});

app.get("/past-bookings/:user_id", (req, res) => {
  const userId = req.params.user_id;
  const sql = `SELECT b.booking_id, p.slot_number, DATE(b.start_time) AS date, IFNULL(b.total_hours, '0') AS total_hours, IFNULL(b.total_amount, 0) AS total_amount, b.booking_status FROM bookings b JOIN parking_slots p ON b.slot_id = p.slot_id WHERE b.user_id = ? ORDER BY b.start_time DESC`;
  db.query(sql, [userId], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

app.get("/booking/:id", (req, res) => {
  const id = req.params.id;
  const sql = `SELECT booking_id, slot_id AS slot, start_time AS date, total_hours AS duration, total_amount AS amount, vehicle_number AS vehicle_no, 'Card/UPI' AS payment_method FROM bookings WHERE booking_id = ?`;
  db.query(sql, [id], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result[0] || {});
  });
});

app.get("/transaction/:id", (req, res) => {
  const transactionId = req.params.id;
  const sql = `SELECT transaction_id, amount_paid FROM transactions WHERE transaction_id = ?`;
  db.query(sql, [transactionId], (err, result) => {
    if (err) return res.status(500).json({ success: false, message: "DB error", error: err });
    if (result.length > 0) {
      res.json({ success: true, data: result[0] });
    } else {
      res.json({ success: false, message: "Transaction not found" });
    }
  });
});


// ================= SUPPORT & DASHBOARD =================

app.post("/support/create", (req, res) => {
  const { user_id, subject, message } = req.body;
  const sql = `INSERT INTO customer_support (user_id, subject, message) VALUES (?, ?, ?)`;
  db.query(sql, [user_id, subject, message], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json({ success: true, ticket_id: result.insertId });
  });
});

app.get("/support/user/:userId", (req, res) => {
  const userId = req.params.userId;
  const sql = `SELECT * FROM customer_support WHERE user_id = ? ORDER BY created_at DESC`;
  db.query(sql, [userId], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

app.get("/admin/dashboard", (req, res) => {
  const sql = `SELECT (SELECT COUNT(*) FROM parking_slots) AS total_slots, (SELECT COUNT(*) FROM bookings WHERE booking_status = 'active') AS occupied_slots, (SELECT IFNULL(SUM(total_amount), 0) FROM bookings) AS total_revenue`;
  db.query(sql, (err, result) => {
    if (err) return res.status(500).json({ error: "Database error" });
    const dbData = result[0];
    res.json({
      totalSlots: dbData.total_slots,
      occupiedSlots: dbData.occupied_slots,
      occupibleSlots: dbData.total_slots - dbData.occupied_slots,
      totalRevenue: dbData.total_revenue
    });
  });
});


// ================= PRICING =================

// GET Pricing
app.get("/pricing", (req, res) => {
  db.query("SELECT * FROM vehicle_type", (err, result) => {
    if (err) return res.status(500).json(err);
    
    let carPrice = 0;
    let motorcyclePrice = 0;

    // Loop through the results to find Car and Motorcycle prices
    result.forEach(row => {
      // Adjust the strings 'Car' and 'Motorcycle' if they are spelled differently in your database
      if (row.type_name.toLowerCase() === 'car') {
        carPrice = row.price_per_hour;
      } else if (row.type_name.toLowerCase() === 'motorcycle' || row.type_name.toLowerCase() === 'bike') {
        motorcyclePrice = row.price_per_hour;
      }
    });

    // Send it back as a single object so Android Retrofit can map it to your Pricing.java model
    res.json({
      car_price: carPrice,
      motorcycle_price: motorcyclePrice
    });
  });
});

// POST Update Pricing
app.post("/pricing/update", (req, res) => {
  const { car_price, motorcycle_price } = req.body;

  if (car_price === undefined || motorcycle_price === undefined) {
    return res.status(400).json({ error: "Missing pricing data" });
  }

  // Update Car Price
  const updateCar = "UPDATE vehicle_type SET price_per_hour = ? WHERE LOWER(type_name) = 'car'";
  db.query(updateCar, [car_price], (err1) => {
    if (err1) return res.status(500).json({ error: "Failed to update car price", details: err1 });

    // Update Motorcycle Price
    const updateBike = "UPDATE vehicle_type SET price_per_hour = ? WHERE LOWER(type_name) IN ('motorcycle', 'bike')";
    db.query(updateBike, [motorcycle_price], (err2) => {
      if (err2) return res.status(500).json({ error: "Failed to update bike price", details: err2 });

      res.json({ success: true, message: "Pricing updated successfully" });
    });
  });
});

// const PORT = 3000;
// app.listen(PORT, () => {
//   console.log(`Server running on port ${PORT}`);
// });

app.listen(3000, '0.0.0.0', () => {
  console.log("Server running on port 3000");
});