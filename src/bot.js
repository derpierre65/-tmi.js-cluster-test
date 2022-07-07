import tmi from 'tmi.js';
import {RedisChannelDistributor, TmiClient} from 'tmi.js-cluster';
import {database, redisClient} from './db.js';

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
	// handle message
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