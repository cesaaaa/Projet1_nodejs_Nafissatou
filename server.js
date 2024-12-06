const express = require("express");
const mysql = require("mysql");
const bodyParser = require("body-parser");
const session = require("express-session");

const app = express();
const port = 3000;

// Configuration de la base de données
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "gestion_users"
});

db.connect((err) => {
    if (err) throw err;
    console.log("Base de données connectée !");
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

// Routes
// Page de connexion
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
            
            if (results[0].role === "admin") {
                res.redirect("/admin");
            } else {
                res.redirect("/user");
            }
        } else {
            res.render("login", { error: "Identifiants incorrects !" });
        }
    });
});

// Dashboard admin
app.get("/admin", (req, res) => {
    if (!req.session.loggedIn || req.session.user.role !== "admin") {
        return res.redirect("/");
    }

    const query = "SELECT * FROM users";
    db.query(query, (err, results) => {
        if (err) throw err;
        res.render("dashboard-admin", { users: results });
    });
});

// Ajouter un utilisateur
app.post("/admin/add", (req, res) => {
    const { username, password, role } = req.body;

    const query = "INSERT INTO users (username, password, role) VALUES (?, ?, ?)";
    db.query(query, [username, password, role], (err) => {
        if (err) throw err;
        res.redirect("/admin");
    });
});

// Modifier un utilisateur (Admin)
app.get('/admin/edit/:id', (req, res) => {
    const userId = req.params.id;
    db.query('SELECT * FROM users WHERE id = ?', [userId], (err, results) => {
        if (err) throw err;
        if (results.length > 0) {
            res.render('edit-user', { user: results[0] });
        } else {
            res.send("Utilisateur introuvable !");
        }
    });
});

app.post('/admin/edit/:id', (req, res) => {
    const userId = req.params.id;
    const { username, role } = req.body;

    db.query('UPDATE users SET username = ?, role = ? WHERE id = ?', [username, role, userId], (err) => {
        if (err) throw err;
        res.redirect('/admin'); // Redirige vers le tableau de bord des utilisateurs
    });
});

// Supprimer un utilisateur
app.post("/admin/delete", (req, res) => {
    const { id } = req.body;

    const query = "DELETE FROM users WHERE id = ?";
    db.query(query, [id], (err) => {
        if (err) throw err;
        res.redirect("/admin");
    });
});

// Dashboard utilisateur
app.get("/user", (req, res) => {
    if (!req.session.loggedIn || req.session.user.role !== "user") {
        return res.redirect("/");
    }
    res.render("dashboard-user", { user: req.session.user });
});

// Modifier ses infos personnelles (Utilisateur)
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
            res.send("Utilisateur introuvable !");
        }
    });
});

app.post("/user/edit", (req, res) => {
    const userId = req.session.user.id;
    const { username, password } = req.body;

    db.query("UPDATE users SET username = ?, password = ? WHERE id = ?", [username, password, userId], (err) => {
        if (err) throw err;
        res.redirect("/user");
    });
});

// Déconnexion
app.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect("/");
});

// Lancement du serveur
app.listen(port, () => {
    console.log(`Serveur lancé sur http://localhost:${port}`);
});
