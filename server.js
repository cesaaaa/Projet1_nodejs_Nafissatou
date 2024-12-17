// Import required modules
const express = require("express");
const mysql = require("mysql");
const bodyParser = require("body-parser");
const session = require("express-session");
const multer = require("multer");
const app = express();
const port = 3000;

// Database configuration
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "gestion_users"
});

db.connect((err) => {
    if (err) throw err;
    console.log("Database connected!");
});

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(session({
    secret: "secret",
    resave: true,
    saveUninitialized: true
}));

app.set("view engine", "ejs");
app.set("views", "./views");

// Attach user data to res.locals for all views
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

// File upload configuration
const upload = multer({ dest: "uploads/" });

// Routes
// Login page
app.get("/", (req, res) => {
    res.render("login", { error: null });
});

app.post("/login", (req, res) => {
    const { username, password } = req.body;

    const query = "SELECT * FROM users WHERE username = ? AND password = ?";
    db.query(query, [username, password], (err, results) => {
        if (err) throw err;

        if (results.length > 0) {
            req.session.loggedIn = true;
            req.session.user = results[0];

            // Update last login
            db.query("UPDATE users SET lastLogin = NOW() WHERE id = ?", [results[0].id], (updateErr) => {
                if (updateErr) throw updateErr;
            });

            res.redirect(results[0].role === "admin" ? "/admin" : "/user");
        } else {
            res.render("login", { error: "Invalid credentials!" });
        }
    });
});

// Admin dashboard
app.get("/admin", (req, res) => {
    if (!req.session.loggedIn || req.session.user.role !== "admin") {
        return res.redirect("/");
    }

    const { search = '', role = '', page = 1 } = req.query;
    const itemsPerPage = 10;

    let query = "SELECT * FROM users WHERE 1=1";
    const params = [];

    if (search) {
        query += " AND (nom LIKE ? OR mail LIKE ?)";
        params.push(`%${search}%`, `%${search}%`);
    }
    if (role) {
        query += " AND role = ?";
        params.push(role);
    }

    query += " LIMIT ? OFFSET ?";
    params.push(itemsPerPage, (page - 1) * itemsPerPage);

    const countQuery = "SELECT COUNT(*) as count FROM users WHERE 1=1";
    const countParams = [...params.slice(0, -2)];

    db.query(countQuery, countParams, (err, countResult) => {
        if (err) throw err;

        const totalUsers = countResult[0].count;
        const totalPages = Math.ceil(totalUsers / itemsPerPage);

        db.query(query, params, (err, results) => {
            if (err) throw err;

            res.render("dashboard-admin", {
                users: results,
                search,
                role,
                currentPage: parseInt(page, 10),
                totalPages
            });
        });
    });
});

// Add user (Admin)
app.post("/admin/add", (req, res) => {
    const { username, password, role, nom, mail, tel } = req.body;

    const query = "INSERT INTO users (username, password, role, nom, mail, tel) VALUES (?, ?, ?, ?, ?, ?)";
    db.query(query, [username, password, role, nom, mail, tel], (err) => {
        if (err) throw err;
        res.redirect("/admin");
    });
});

// Edit user (Admin)
app.get("/admin/edit/:id", (req, res) => {
    const userId = req.params.id;

    db.query("SELECT * FROM users WHERE id = ?", [userId], (err, results) => {
        if (err) throw err;
        if (results.length > 0) {
            res.render("edit-user", { user: results[0] });
        } else {
            res.send("User not found!");
        }
    });
});

app.post("/admin/edit/:id", (req, res) => {
    const userId = req.params.id;
    const { username, role, nom, mail, tel } = req.body;

    db.query("UPDATE users SET username = ?, role = ?, nom = ?, mail = ?, tel = ? WHERE id = ?", [username, role, nom, mail, tel, userId], (err) => {
        if (err) throw err;
        res.redirect("/admin");
    });
});

// Delete user (Admin)
app.post("/admin/delete/:id", (req, res) => {
    const userId = req.params.id;

    db.query("DELETE FROM users WHERE id = ?", [userId], (err) => {
        if (err) throw err;
        res.redirect("/admin");
    });
});

// User dashboard
app.get("/user", (req, res) => {
    if (!req.session.loggedIn || req.session.user.role !== "user") {
        return res.redirect("/");
    }

    res.render("dashboard-user", { user: req.session.user });
});

// Edit user profile (User)
app.get("/user/edit", (req, res) => {
    if (!req.session.loggedIn || req.session.user.role !== "user") {
        return res.redirect("/");
    }

    const userId = req.session.user.id;

    db.query("SELECT * FROM users WHERE id = ?", [userId], (err, results) => {
        if (err) throw err;
        if (results.length > 0) {
            res.render("edit-profile", { user: results[0] });
        } else {
            res.send("User not found!");
        }
    });
});

app.post("/user/edit", (req, res) => {
    const userId = req.session.user.id;
    const { password, nom, mail, tel } = req.body;

    db.query("UPDATE users SET password = ?, nom = ?, mail = ?, tel = ? WHERE id = ?", [password, nom, mail, tel, userId], (err) => {
        if (err) throw err;
        res.redirect("/user");
    });
});

// Upload profile picture (User)
app.post("/user/upload-profile", upload.single("profilePic"), (req, res) => {
    // Check if file was uploaded
    if (!req.file) {
        return res.status(400).send("No file uploaded. Please try again.");
    }

    // Check if user session exists
    if (!req.session || !req.session.user) {
        return res.status(403).send("User not authenticated.");
    }

    const userId = req.session.user.id;
    const profilePath = `/uploads/${req.file.filename}`;

    // Update profile picture in the database
    db.query(
        "UPDATE users SET profilePicture = ? WHERE id = ?", 
        [profilePath, userId], 
        (err) => {
            if (err) {
                console.error("Database error:", err);
                return res.status(500).send("An error occurred while updating the profile picture.");
            }

            // Update session with new profile picture path
            req.session.user.profilePicture = profilePath;
            res.redirect("/user");
        }
    );
});

// Logout
app.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/");
});

// Start server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
