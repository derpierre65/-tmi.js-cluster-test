import mysql from 'mysql';
import {createClient} from 'redis';

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

const redisSub = createClient({
	url: 'redis://' + process.env.REDIS_URL,
});

const redisPub = createClient({
	url: 'redis://' + process.env.REDIS_URL,
});

export {
	database,
	redisPub,
	redisSub,
};