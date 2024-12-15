const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const db_access = require('./db.js'); // Assuming db.js handles database connection
const db = db_access.db;
const cookieParser = require('cookie-parser');
const server = express();
const port = 5555;
const secret_key = 'DdsdsdKKFDDFDdvfddvxvcvc4dsdvdsvdb';

// // Connect with database
// db_access();
server.use(cors({
    origin: "http://localhost:3000",
    credentials: true
}))
server.use(express.json())
server.use(cookieParser())

// Helper functions for JWT token generation and verification
const generateToken = (id, isAdmin) => {
    return jwt.sign({ id, isAdmin }, secret_key, { expiresIn: '1h' })
}

const verifyToken = (req, res, next) => {
    const token = req.cookies.authToken;
    if (!token) {
        return res.status(401).send('Unauthorized');
    }
    jwt.verify(token, secret_key, (err, details) => {
        if (err) {
            return res.status(403).send('Invalid or expired token');
        }
        req.userDetails = details;
        next();
    });
}

//######################################################################################################################################################################################
// 1. POST /customers - Register a new customer
server.post(`/customers`, (req, res) => {
    const name = req.body.name
    const email = req.body.email
    const password = req.body.password
    
    db.run(`INSERT INTO CUSTOMER (NAME,EMAIL,PASSWORD,ISADMIN) VALUES (?,?,?,?)`, [name, email, password, 0], (err) => {
        if (err) {
            return res.status(401).send(err)
        }
        else
            return res.status(200).send(`registration successfull`)
    })
})

// 2. POST /login - Authenticate a customer (check email/password)
server.post('/login', (req, res) => {
    const email = req.body.email;
    const password = req.body.password;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    db.get('SELECT * FROM CUSTOMER WHERE EMAIL = ? AND PASSWORD = ?', [email, password], (err, row) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ message: 'Error finding user' });
        }
        
        if (!row) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const userID = row.ID;
        const isAdmin = row.ISADMIN === 1;
        console.log('User login:', { userID, isAdmin, rawIsAdmin: row.ISADMIN });
        
        const token = generateToken(userID, isAdmin);

        res.cookie('authToken', token, {
            httpOnly: true,
            sameSite: 'none',
            secure: true,
            maxAge: 3600000 // 1 hour in milliseconds
        });
        
        return res.status(200).json({ 
            id: userID, 
            admin: isAdmin,
            message: 'Login successful' 
        });
    });
})

//#########################################################################################################

// 3. GET /customers- Get all customers
server.get('/customers', verifyToken, (req, res) => {
    const ISADMIN = req.userDetails.isAdmin;
    if (!ISADMIN) {
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
    if (!ISADMIN) {
        return res.status(403).send('Forbidden');
    }
    db.run(customer, (err) => {
        if (err) {
            return res.status(500).send('Error deleting customer')
        }
        res.status(200).send('Customer deleted successfully')
    })
})
//####################################################################
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
server.post('/shoes', verifyToken, (req, res) => {
     const ISADMIN = req.userDetails.isAdmin;
     // Check if the user is an admin
    if (!ISADMIN) {
         return res.status(403).send('Only admins can add shoes')
     }
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
    if (!ISADMIN) {
        return res.status(403).send('Only admins can update shoes');
    }

    const name = req.body.name
    const brand = req.body.brand
    const size = req.body.size
    const color = req.body.color
    const price = req.body.price
    const quantity = parseInt(req.body.quantity, 10)

    const query = `UPDATE SHOES SET NAME = ?, BRAND = ?, SIZE= ?, PRICE = ?, QUANTITY = ? WHERE id = ?`
    db.run(query, [name, brand, size, color, price, quantity, req.params.id], (err) => {
        if (err) {
            return res.status(500).send('Error updating shoe');
        }
        res.status(200).send(`Shoe updated successfully`)
    })
})

// 5. DELETE /shoes/:id - Delete a shoe from inventory (admin-only)
server.delete('/shoes/:id', verifyToken, (req, res) => {
     const isAdmin = req.userDetails.isAdmin;
     // Check if the user is an admin
     if (!isAdmin) {
         return res.status(403).send(`Only admins can delete shoes`)
     }
    const shoeId = req.params.id;
    
    // First delete related records from ORDERS table
    const deleteOrdersQuery = 'DELETE FROM ORDERS WHERE SHOE_ID = ?';
    db.run(deleteOrdersQuery, [shoeId], function(err) {
        if (err) {
            console.error('Database error deleting orders:', err);
            return res.status(500).send('Error deleting shoe orders');
        }
        
        // Then delete related records from CART table
        const deleteCartQuery = 'DELETE FROM CART WHERE SHOE_ID = ?';
        db.run(deleteCartQuery, [shoeId], function(err) {
            if (err) {
                console.error('Database error deleting cart items:', err);
                return res.status(500).send('Error deleting shoe from cart');
            }
            
            // Finally delete the shoe
            const deleteShoeQuery = 'DELETE FROM SHOES WHERE ID = ?';
            db.run(deleteShoeQuery, [shoeId], function(err) {
                if (err) {
                    console.error('Database error:', err);
                    return res.status(500).send('Error deleting shoe');
                }
                res.status(200).send('Shoe deleted successfully');
            });
        });
    });
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

    if (!ISADMIN) {
        return res.status(403).send(`Only admins can delete shoes`)
    }
    const query = 'SELECT * FROM ORDERS';
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('Error retrieving orders');
        }
        res.status(200).json(rows);
    });
})

// 3. GET /orders/:id - Get details of a specific order
server.get(`/orders/:id`, verifyToken, (req, res) => {
    const ISADMIN = req.userDetails.isAdmin;
    // Check if the user is an admin
    if (!ISADMIN) {
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
server.get('/orders/customer/:id', (req, res) => {
    // const ISADMIN = req.userDetails.isAdmin;
    // // Check if the user is an admin
    // if (ISADMIN !== 1) {
    //     return res.status(403).send('Forbidden');
    // }

    const customerId = req.params.id; // Ensure this matches the route definition
    const query = `SELECT * FROM ORDERS WHERE customer_id = ?`;

    db.all(query, [customerId], (err, rows) => {
        if (err) {
            console.error('Database error:', err); // Log the error for debugging
            return res.status(500).send('Error retrieving orders');
        }
        res.status(200).json(rows); // Use .json for sending structured data
    });
});

//######################################################################################################
// 6. DELETE /orders/:id - Cancel/delete an order (optional)
server.delete('/orders/:id', verifyToken, (req, res) => {
    const ISADMIN = req.userDetails.isAdmin;
    // Check if the user is an admin
    if (!ISADMIN) {
        return res.status(403).send(`Forbidden`)
    }
    
    // Delete the order from the database
    db.run('DELETE FROM ORDERS WHERE ID = ?', [req.params.id], function(err) {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('Error deleting order');
        }
        if (this.changes === 0) {
            return res.status(404).send('Order not found');
        }
        res.status(200).send({ message: 'Order deleted successfully' });
    });
});

// Create Cart table
db.run(`CREATE TABLE IF NOT EXISTS CART (
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    CUSTOMER_ID INTEGER NOT NULL,
    SHOE_ID INTEGER NOT NULL,
    QUANTITY INTEGER NOT NULL,
    FOREIGN KEY (CUSTOMER_ID) REFERENCES CUSTOMER(ID),
    FOREIGN KEY (SHOE_ID) REFERENCES SHOES(ID)
)`);

server.get('/cart/:id', (req, res) => {
    const customer_id = req.params.id;

    if (!customer_id) {
        return res.status(400).json({ error: 'Customer ID is required' });
    }

    const query = `
        SELECT 
            c.ID,
            c.CUSTOMER_ID,
            c.SHOE_ID,
            c.QUANTITY as CART_QUANTITY,
            s.NAME,
            s.BRAND,
            s.SIZE,
            s.COLOR,
            s.PRICE,
            s.QUANTITY as STOCK_QUANTITY
        FROM CART c
        JOIN SHOES s ON c.SHOE_ID = s.ID
        WHERE c.CUSTOMER_ID = ?
    `;
    
    db.all(query, [customer_id], (err, rows) => {
        if (err) {
            console.error('Database Error:', err.message);
            return res.status(500).json({ error: 'Error retrieving cart' });
        }
        res.status(200).json(rows || []);
    });
});

server.post('/cart', (req, res) => {
    const { customer_id, shoe_id, quantity } = req.body;

    // Validate input
    if (!customer_id || !shoe_id || !quantity) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    // First check if item already exists in cart
    db.get('SELECT * FROM CART WHERE CUSTOMER_ID = ? AND SHOE_ID = ?', 
        [customer_id, shoe_id], 
        (err, existingItem) => {
            if (err) {
                return res.status(500).json({ error: 'Database error checking cart' });
            }

            // Check stock availability
            db.get('SELECT QUANTITY as STOCK FROM SHOES WHERE ID = ?', [shoe_id], (err, shoe) => {
                if (err) {
                    return res.status(500).json({ error: 'Database error checking stock' });
                }
                if (!shoe) {
                    return res.status(404).json({ error: 'Shoe not found' });
                }

                const requestedQuantity = existingItem 
                    ? existingItem.QUANTITY + quantity 
                    : quantity;

                if (shoe.STOCK < requestedQuantity) {
                    return res.status(400).json({ error: 'Not enough stock available' });
                }

                if (existingItem) {
                    // Update existing cart item
                    db.run('UPDATE CART SET QUANTITY = ? WHERE ID = ?',
                        [requestedQuantity, existingItem.ID],
                        (err) => {
                            if (err) {
                                return res.status(500).json({ error: 'Error updating cart' });
                            }
                            res.status(200).json({ message: 'Cart updated successfully' });
                        });
                } else {
                    // Add new cart item
                    db.run('INSERT INTO CART (CUSTOMER_ID, SHOE_ID, QUANTITY) VALUES (?, ?, ?)',
                        [customer_id, shoe_id, quantity],
                        function(err) {
                            if (err) {
                                return res.status(500).json({ error: 'Error adding to cart' });
                            }
                            res.status(201).json({ 
                                message: 'Added to cart successfully',
                                cartId: this.lastID
                            });
                        });
                }
            });
        });
});

server.put('/cart/:id', (req, res) => {
    const cartId = req.params.id;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
        return res.status(400).json({ error: 'Invalid quantity' });
    }

    // Get cart item and check stock
    db.get(`
        SELECT c.*, s.QUANTITY as STOCK_QUANTITY 
        FROM CART c
        JOIN SHOES s ON c.SHOE_ID = s.ID
        WHERE c.ID = ?
    `, [cartId], (err, item) => {
        if (err) {
            return res.status(500).json({ error: 'Database error' });
        }
        if (!item) {
            return res.status(404).json({ error: 'Cart item not found' });
        }
        if (item.STOCK_QUANTITY < quantity) {
            return res.status(400).json({ error: 'Not enough stock available' });
        }

        // Update cart quantity
        db.run('UPDATE CART SET QUANTITY = ? WHERE ID = ?', 
            [quantity, cartId],
            (err) => {
                if (err) {
                    return res.status(500).json({ error: 'Error updating cart' });
                }
                res.status(200).json({ message: 'Cart updated successfully' });
            });
    });
});

server.delete('/cart/:id', (req, res) => {
    const cartId = req.params.id;

    db.run('DELETE FROM CART WHERE ID = ?', [cartId], (err) => {
        if (err) {
            return res.status(500).json({ error: 'Error removing item from cart' });
        }
        res.status(200).json({ message: 'Item removed successfully' });
    });
});

// Get all users (admin only)
server.get('/users', verifyToken, (req, res) => {
    const ISADMIN = req.userDetails.isAdmin;
    if (!ISADMIN) {
        return res.status(403).send('Forbidden');
    }
    
    const query = 'SELECT * FROM CUSTOMER';
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('Error retrieving users');
        }
        res.status(200).json(rows);
    });
});

// Get all orders (admin only)
server.get('/orders', verifyToken, (req, res) => {
    const ISADMIN = req.userDetails.isAdmin;
    if (!ISADMIN) {
        return res.status(403).send('Forbidden');
    }
    
    const query = 'SELECT * FROM ORDERS';
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('Error retrieving orders');
        }
        res.status(200).json(rows);
    });
});

// Delete order (admin only)
server.delete('/orders/:id', verifyToken, (req, res) => {
    const ISADMIN = req.userDetails.isAdmin;
    if (!ISADMIN) {
        return res.status(403).send('Forbidden');
    }

    const orderId = req.params.id;
    const query = 'DELETE FROM ORDERS WHERE ID = ?';
    
    db.run(query, [orderId], function(err) {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('Error deleting order');
        }
        if (this.changes === 0) {
            return res.status(404).send('Order not found');
        }
        res.status(200).send('Order deleted successfully');
    });
});

// Get all users (admin only)
server.get('/users', verifyToken, (req, res) => {
    const ISADMIN = req.userDetails.isAdmin;
    if (!ISADMIN) {
        return res.status(403).send('Forbidden');
    }
    
    const query = 'SELECT * FROM CUSTOMER';
    db.all(query, [], (err, rows) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('Error retrieving users');
        }
        res.status(200).json(rows);
    });
});

// Delete user (admin only)
server.delete('/users/:id', verifyToken, (req, res) => {
    const ISADMIN = req.userDetails.isAdmin;
    if (!ISADMIN) {
        return res.status(403).send('Forbidden');
    }

    const userId = req.params.id;
    const query = 'DELETE FROM CUSTOMER WHERE ID = ?';
    
    db.run(query, [userId], function(err) {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).send('Error deleting user');
        }
        if (this.changes === 0) {
            return res.status(404).send('User not found');
        }
        res.status(200).send('User deleted successfully');
    });
});


// Start the server
server.listen(port, () => {
    console.log(`Server is running on port ${port}`)
})


