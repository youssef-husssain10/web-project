const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const db_access = require('./db.js'); // Assuming db.js handles database connection
const db = db_access.db;
const cookieParser = require('cookie-parser');
const server = express();
const port = 5555;
const secret_key = 'DdsdsdKKFDDFDdvfddvxvc4dsdvdsvdb';

// // Connect with database
// db_access();
server.use(cors({
    origin: "http://localhost:3000",
    credentials: true
}))
server.use(express.json())
server.use(cookieParser())

// Helper functions for JWT token generation and verification
const generateToken = (id, isADMIN) => {
    return jwt.sign({ id, isADMIN }, secret_key, { expiresIn: '1h' })
}

const verifyToken = (req, res, next) => {
    const token = req.cookies.authToken;
    if (!token)
        return res.status(401).send('Unauthorized')
    jwt.verify(token, secret_key, (err, details) => {
        if (err)
            return res.status(403).send('Invalid or expired token')
        req.userDetails = details;
        next();
    })
}
