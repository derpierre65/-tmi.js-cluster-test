const tmi = require('tmi.js');
const mysql = require('mysql');
const { createClient } = require('redis');
const { RedisCommandQueue, TmiClient, RedisChannelDistributor } = require('tmi.js-cluster/src');
const fs = require('fs');

if (!process.env.REDIS_URL) {
	require('dotenv').config();
}

if (!fs.existsSync('channels')) {
	fs.mkdirSync('channels');
}

const db = mysql.createPool({
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

const tmiClient = new tmi.Client({
	connection: {
		reconnect: false,
		reconnectDecay: 1,
		secure: true,
		reconnectInterval: 10000,
	},
	identity: {
		username: process.env.TMI_USERNAME,
		password: process.env.TMI_PASSWORD,
	},
});

tmiClient.on('message', (channel, userstate, message, self) => {
	fs.writeFile('channels/' + channel + '.log', [(new Date()).toISOString(), message].join(': ') + '\n', { flag: 'a+' }, function (err) {
		if (err) {
			return console.log(err);
		}
	});
});

redisClient
	.connect()
	.then(async () => {
		console.log('[Bot] ready');

		new TmiClient({
			tmiClient,
			database: db,
			channelDistributor: new RedisChannelDistributor(db, new RedisCommandQueue(redisClient)),
		});

		tmiClient.connect();
	});