const mysql = require('mysql');
const { createClient } = require('redis');
const { RedisCommandQueue, Supervisor, RedisChannelDistributor } = require('tmi.js-cluster/src');

if (!process.env.REDIS_URL) {
	require('dotenv').config();
}

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

redisClient
	.connect()
	.then(() => {
		const manager = new Supervisor({
			database,
			redisClient,
			channelDistributor: RedisChannelDistributor,
		}, {
			autoScale: {
				processes: {
					min: 1,
					max: 5,
				},
				thresholds: {
					channels: 50,
					scaleUp: 75,
					scaleDown: 50,
				},
			},
		});

		manager.on('supervisor.terminate', (id) => {
			console.log('[supervisor] terminate', id);
		});

		manager.on('process.create', (id) => {
			console.log('[supervisor] new process created, id:', id);
		});

		manager.on('tmi.join_error', (...args) => {
			console.log('[supervisor] can\'t join channel:', ...args);
		});

		manager.spawn();
	})
	.catch((error) => {
		console.error('Can\'t connect to redis.', error);
	});