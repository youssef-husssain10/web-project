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
