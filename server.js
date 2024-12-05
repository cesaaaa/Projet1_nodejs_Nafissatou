const express = require('express');
const path = require('path');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const app = express();
const port = 3000;

// MySQL connection setup
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',      
  password: '', 
  database: 'gestion_utilisateurs' 
});

// Connect to MySQL
db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err.stack);
    return;
  }
  console.log('Connected to the database');
});

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());  // To parse JSON request body

// Serve the login page
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'login.html'));
});

// Handle login form submission
app.post('/login', (req, res) => {
  const { username, mdp } = req.body;

  // Query the database to check if the user exists
  db.execute('SELECT * FROM users WHERE username = ? AND password = ?', [username, mdp], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Server error');
    }

    if (results.length > 0) {
      // If a match is found, redirect to dashboard
      res.redirect('/dashboard');
    } else {
      // If no match, return "incorrect credentials" message
      res.status(401).send('Identifiants incorrects. Réessayer');
    }
  });
});

// Dashboard route
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

// Default route to redirect to login
app.get('/', (req, res) => {
  res.redirect('/login');
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
