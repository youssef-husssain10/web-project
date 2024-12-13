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
// 1. POST /customers - Register a new customer
server.post(`/customers`, (req, res) => {
    const name = req.body.name
    const email = req.body.email
    const password = req.body.password
    bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
            return res.status(500).send('error hashing password')
        }
        db.run(`INSERT INTO CUSTOMER (NAME,EMAIL,PASSWORD,ISADMIN) VALUES (?,?,?,?)`, [name, email, hashedPassword, 0], (err) => {
            if (err) {

                return res.status(401).send(err)
            }
            else
                return res.status(200).send(`registration successfull`)
        })
    })
})

// 2. POST /login - Authenticate a customer (check email/password)
server.post('/login', (req, res) => {
    const email = req.body.email
    const password = req.body.password

    db.get('SELECT * FROM CUSTOMER WHERE EMAIL = ?', [email], (err, row) => {
        if (err || !row) {
            return res.status(500).send('Error finding user')
        }

        bcrypt.compare(password, row.PASSWORD, (err, isMatch) => {
            if (err) {
                return res.status(500).send('Error comparing password.')
            }
            if (!isMatch) {
                return res.status(401).send('Invalid credentials')
            }
            else { }
            let userID = row.ID
            let isADMIN = row.ISADMIN
            const token = generateToken(userID, isADMIN);

            res.cookie('authToken', token, {
                httpOnly: true,
                sameSite: 'none',
                secure: true,
                expiresIn: '1h'

            })
            return res.status(200).send({ id: userID, admin: isADMIN });
        })
    })
})

//#########################################################################################################

// 3. GET /customers- Get all customers
server.get('/customers', verifyToken, (req, res) => {
    const ISADMIN = req.userDetails.isAdmin;
    if (ISADMIN !== 1) {
        return res.status(403).send('Forbidden');
    }
    db.get('SELECT * FROM CUSTOMER ', (err, row) => {
        if (err) {
            console.log(err)
            return res.status(404).send(err);
        }
        res.status(200).send(row)
    })
})

// 4. DELETE /customers/:id - Delete a customer
server.delete('/customers/:id', verifyToken, (req, res) => {
    const customer = `DELETE FROM CUSTOMER WHERE ID = ${req.params.id}`
    const ISADMIN = req.userDetails.isAdmin;
    // Ensure that only the customer or an admin can delete the data
    if (ISADMIN !== 1) {
        return res.status(403).send('Forbidden');
    }
    db.run(customer, (err) => {
        if (err) {
            return res.status(500).send('Error deleting customer')
        }
        res.status(200).send('Customer deleted successfully')
    })
})
