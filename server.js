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
// 1. GET /shoes - Get a list of all shoes
server.get('/shoes', (req, res) => {
    db.all(`SELECT * FROM SHOES`, (err, rows) => {
        if (err) {
            return res.status(500).send('Error retrieving shoes')
        }
        res.status(200).send(rows)
    })
})

// 3. POST /shoes - Add a new shoe (admin-only)
server.post('/shoes', (req, res) => {
    // const ISADMIN = req.userDetails.isAdmin;
    // // Check if the user is an admin
    // if (ISADMIN !== 1) {
    //     return res.status(403).send('Only admins can add shoes')
    // }
    const name = req.body.name
    const brand = req.body.brand
    const size = req.body.size
    const color = req.body.color
    const price = req.body.price
    const quantity = parseInt(req.body.quantity, 10)
    const query = 'INSERT INTO SHOES (NAME,BRAND,SIZE,PRICE,COLOR,QUANTITY) VALUES (?, ?, ?, ?, ?, ?)';
    db.run(query, [name, brand, size, price, color, quantity], (err) => {
        if (err) {
            return res.status(500).send('Error adding shoe');
        }
        res.status(201).send('Shoe added successfully')
    })
})
////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// 4. PUT /shoes/:id - Update a shoe's details (admin-only)
server.put('/shoes/:id', verifyToken, (req, res) => {
    const ISADMIN = req.userDetails.isAdmin;
    // Check if the user is an admin
    if (ISADMIN !== 1) {
        return res.status(403).send('Only admins can update shoes');
    }

    const name = req.body.name
    const brand = req.body.brand
    const size = req.body.size
    const color = req.body.color
    const price = req.body.price
    const quantity = parseInt(req.body.quantity, 10)

    const query = `UPDATE SHOES SET NAME = ?, BRAND = ?, SIZE= ?, PRICE = ?, QUANTITY = ? WHERE id = ?`
    db.run(query, [name, brand, size, color, price, quantity], (err) => {
        if (err) {
            return res.status(500).send('Error updating shoe');
        }
        res.status(200).send(`Shoe updated successfully`)
    })
})

// 5. DELETE /shoes/:id - Delete a shoe from inventory (admin-only)
server.delete('/shoes/:id', verifyToken, (req, res) => {
    const ISADMIN = req.userDetails.isAdmin;
    // Check if the user is an admin
    if (ISADMIN !== 1) {
        return res.status(403).send(`Only admins can delete shoes`)
    }
    const query = `DELETE FROM SHOES WHERE id = ${req.params.id}`
    db.run(query, (err) => {
        if (err) {
            console.log(err)
            return res.send(err)
        }
        else if (!row) {
            return res.status(404).send(`Error Deleting`)
        }
        else {
            res.status(200).send(row)
        }
    })
})
// 1. POST /orders - Place a new order
server.post('/orders', (req, res) => {
    const customer_id = req.body.customer_id
    const shoe_id = req.body.shoe_id
    const quantity = parseInt(req.body.quantity, 10)

    const query = `INSERT INTO ORDERS (CUSTOMER_ID, SHOE_ID, QUANTITY) VALUES (?, ?, ?)`
    db.run(query, [customer_id, shoe_id, quantity], (err) => {
        if (err) {
            return res.status(500).send('Error placing order')
        }
        res.status(201).send('Order placed successfully')
    })
})

// 2. GET /orders - Get all orders (admin-only)
server.get('/orders', verifyToken, (req, res) => {
    const ISADMIN = req.userDetails.isAdmin;

    if (ISADMIN !== 1) {
        return res.status(403).send(`Only admins can delete shoes`)
    }
    db.all('SELECT * FROM ORDERS', (err, rows) => {
        if (err) {
            return res.status(500).send('Error retrieving orders');
        }
        res.status(200).send(rows);
    })
})

// 3. GET /orders/:id - Get details of a specific order
server.get(`/orders/:id`, verifyToken, (req, res) => {
    const ISADMIN = req.userDetails.isAdmin;
    // Check if the user is an admin
    if (ISADMIN !== 1) {
        return res.status(403).send('Forbidden');
    }
    db.get(`SELECT * FROM ORDERS WHERE id =  ${req.params.id}`, (err, row) => {
        if (err) { //send the error
            console.log(err)
            return res.send(err)
        }
        else if (!row) {  //not found id
            return res.status(404).send(`The Order with id: ${req.params.id} is not found`) //404 not found
        }
        res.status(200).send(row)
    })
})
//######################################################################################################
// 4. GET /orders/customer/:id - Get all orders for a specific customer
server.get('/orders/customer/:id', verifyToken, (req, res) => {
    const ISADMIN = req.userDetails.isAdmin;
    // Check if the user is an admin
    if (ISADMIN !== 1) {
        return res.status(403).send('Forbidden');
    }
    db.all(`SELECT * FROM ORDERS WHERE customer_id = ${req.params.customer_id}`, (err, rows) => {
        if (err) {
            return res.status(500).send('Error retrieving orders')
        }
        res.status(200).send(rows)
    })
})
//######################################################################################################
// 5. PUT /orders/:id - Update order details (e.g., status)
server.put('/orders/:id', verifyToken, (req, res) => {
    const ISADMIN = req.userDetails.isAdmin;
    // Check if the user is an admin
    if (ISADMIN !== 1) {
        return res.status(403).send('Forbidden');
    }

    db.get( `SELECT * FROM ORDERS WHERE id = ${req.params.id}`, (err, row) => {
        if (err) { //send the error
            console.log(err)
            return res.send(err)
        }
        else if (!row) {  //not found id
            return res.status(404).send(`The Order with id: ${req.params.id} is not found`) //404 not found
        }
        res.status(200).send(row)

        // Update order status
        const updateQuery = 'UPDATE ORDERS SET status = ? WHERE id = ?'
        db.run(updateQuery, [status, id], function (err) {
            if (err) {
                return res.status(500).send('Error updating order')
            }
            res.status(200).send('Order updated successfully' )
        })
    })
})
//####################################################################################################
// 6. DELETE /orders/:id - Cancel/delete an order (optional)
server.delete('/orders/:id', verifyToken, (req, res) => {
    const ISADMIN = req.userDetails.isAdmin;
    // Check if the user is an admin
    if (ISADMIN !== 1) {
        return res.status(403).send(`Forbidden`)
    }
        // Delete the order from the database
        db.run(`SELECT * FROM ORDERS WHERE id =${req.params.id}`, (err) => {
            if (err) {
                return res.status(500).send('Error deleting order');
            }
            res.status(200).send({ message: 'Order deleted successfully' })
        })
    })
// 1. GET /cart/:id - Get the cart for a specific customer
server.get('/cart/:id', verifyToken, (req, res) => {
    const { id } = req.params
    const { userDetails } = req
    const { isADMIN } = userDetails

    if (userDetails.id !== parseInt(id) && !isADMIN) {
        return res.status(403).send('Forbidden')
    }

    const query = 'SELECT * FROM CART WHERE customer_id = ?'
    db.all(query, [id], (err, rows) => {
        if (err) {
            return res.status(500).send('Error retrieving cart')
        }
        res.status(200).json(rows)
    })
})

// 2. POST /cart - Add an item to the cart
server.post('/cart', verifyToken, (req, res) => {
    const { userDetails } = req
    const { shoe_id, quantity } = req.body

    const query = 'INSERT INTO CART (customer_id, shoe_id, quantity) VALUES (?, ?, ?)'
    db.run(query, [userDetails.id, shoe_id, quantity], function (err) {
        if (err) {
            return res.status(500).send('Error adding item to cart')
        }
        res.status(201).send('Item added to cart')
    })
})

// 3. PUT /cart/:id - Update the quantity of an item in the cart
server.put('/cart/:id', verifyToken, (req, res) => {
    const { id } = req.params
    const { quantity } = req.body
    const { userDetails } = req

    const query = 'SELECT * FROM CART WHERE id = ?'
    db.get(query, [id], (err, row) => {
        if (err || !row) {
            return res.status(404).send('Cart item not found')
        }

        // Allow the customer who owns the cart or an admin to update the item
        if (row.customer_id !== userDetails.id && !userDetails.isADMIN) {
            return res.status(403).send('Forbidden')
        }

        const updateQuery = 'UPDATE CART SET quantity = ? WHERE id = ?'
        db.run(updateQuery, [quantity, id], function (err) {
            if (err) {
                return res.status(500).send('Error updating cart item')
            }
            res.status(200).json({ message: 'Cart item updated successfully' })
        })
    })
})

// 4. DELETE /cart/:id - Remove an item from the cart
server.delete('/cart/:id', verifyToken, (req, res) => {
    const { id } = req.params
    const { userDetails } = req

    const query = 'SELECT * FROM CART WHERE id = ?'
    db.get(query, [id], (err, row) => {
        if (err || !row) {
            return res.status(404).send('Cart item not found')
        }

        // Allow the customer who owns the cart or an admin to remove the item
        if (row.customer_id !== userDetails.id && !userDetails.isADMIN) {
            return res.status(403).send('Forbidden');
        }

        const deleteQuery = 'DELETE FROM CART WHERE id = ?'
        db.run(deleteQuery, [id], function (err) {
            if (err) {
                return res.status(500).send('Error removing item from cart')
            }
            res.status(200).json({ message: 'Cart item removed successfully' })
        })
    })
})
