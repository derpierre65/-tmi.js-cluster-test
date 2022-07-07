const mysql = require('mysql');
const { createClient } = require('redis');

const database = mysql.createPool({
	host: process.env.DB_HOST,
	port: process.env.DB_PORT || 3306,
	user: process.env.DB_USERNAME || 'root',
	password: process.env.DB_PASSWORD || '',
	database: process.env.DB_DATABASE,
	multipleStatements: true,
	charset: 'utf8mb4_general_ci',
	timezone: 'utc',
});

const redisClient = createClient({
	url: 'redis://' + process.env.REDIS_URL,
});

module.exports = { database, redisClient };