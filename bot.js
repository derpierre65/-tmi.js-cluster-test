const tmi = require('tmi.js');
const { TmiClient, RedisChannelDistributor } = require('tmi.js-cluster/src');
const fs = require('fs');

if (!process.env.REDIS_URL) {
	require('dotenv').config();
}

const { database, redisClient } = require('./db.js');

if (!fs.existsSync('channels')) {
	fs.mkdirSync('channels');
}

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

tmiClient.on('message', (channel, userstate, message) => {
	const line = `${[(new Date()).toISOString(), message].join(': ')}\n`;
	fs.writeFile('channels/' + channel + '.log', line, { flag: 'a+' }, (err) => {
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
			database,
			redisClient,
			channelDistributor: RedisChannelDistributor,
		});

		tmiClient.connect();
	});