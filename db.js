const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('shoesStore.db');

// Creating the Customers table
const createCustomerTable = `CREATE TABLE IF NOT EXISTS CUSTOMER (
  ID INTEGER PRIMARY KEY AUTOINCREMENT,
  NAME TEXT NOT NULL,
  EMAIL TEXT UNIQUE NOT NULL,
  PASSWORD TEXT NOT NULL,
  ISADMIN INT
)`;

// Creating the Shoes table
const createShoeTable = `CREATE TABLE IF NOT EXISTS SHOES (
  ID INTEGER PRIMARY KEY AUTOINCREMENT,
  NAME TEXT NOT NULL,
  BRAND TEXT NOT NULL,
  SIZE INT NOT NULL,
  COLOR TEXT NOT NULL,
  PRICE INT NOT NULL,
  QUANTITY INT NOT NULL
)`;

// Creating the Orders table
const createOrderTable = `CREATE TABLE IF NOT EXISTS ORDERS (
  CUSTOMER_ID INT NOT NULL,
  SHOE_ID INT NOT NULL,
  QUANTITY INT NOT NULL,
  FOREIGN KEY (CUSTOMER_ID) REFERENCES CUSTOMER(ID),
  FOREIGN KEY (SHOE_ID) REFERENCES SHOES(ID)
)`;

// Creating the Add to Cart table
const createCartTable = `CREATE TABLE IF NOT EXISTS CART (
  CUSTOMER_ID INT NOT NULL,
  SHOE_ID INT NOT NULL,
  QUANTITY INT NOT NULL,
  FOREIGN KEY (CUSTOMER_ID) REFERENCES CUSTOMER(ID),
  FOREIGN KEY (SHOE_ID) REFERENCES SHOES(ID)
)`;

// Creating the Feedback table
const createFeedbackTable = `CREATE TABLE IF NOT EXISTS FEEDBACK (
  CUSTOMER_ID INT NOT NULL,
  SHOE_ID INT NOT NULL,
  COMMENT TEXT,
  FOREIGN KEY (CUSTOMER_ID) REFERENCES CUSTOMER(ID),
  FOREIGN KEY (SHOE_ID) REFERENCES SHOES(ID)
)`;

// Using db.serialize() and db.exec() to create tables in order
db.serialize(() => {
  // Creating the CUSTOMER table
  db.exec(createCustomerTable, (err) => {
    if (err) {
      console.error('Error creating CUSTOMER table:', err.message);
    } else {
      console.log('CUSTOMER table is ready.');
    }
  });

  // Creating the SHOES table
  db.exec(createShoeTable, (err) => {
    if (err) {
      console.error('Error creating SHOES table:', err.message);
    } else {
      console.log('SHOES table is ready.');
    }
  });

  // Creating the ORDERS table
  db.exec(createOrderTable, (err) => {
    if (err) {
      console.error('Error creating ORDERS table:', err.message);
    } else {
      console.log('ORDERS table is ready.');
    }
  });

  // Creating the CART table
  db.exec(createCartTable, (err) => {
    if (err) {
      console.error('Error creating CART table:', err.message);
    } else {
      console.log('CART table is ready.');
    }
  });

  // Creating the FEEDBACK table
  db.exec(createFeedbackTable, (err) => {
    if (err) {
      console.error('Error creating FEEDBACK table:', err.message);
    } else {
      console.log('FEEDBACK table is ready.');
    }
  });
});

// Exporting all constants for use in other parts of the application
module.exports = { 
  db
  // createCustomerTable,
  // createShoeTable,
  // createOrderTable,
  // createCartTable,
  // createFeedbackTable
};


