import tmi from 'tmi.js';
import {RedisChannelDistributor, TmiClient} from 'tmi.js-cluster';
import {database, redisPub, redisSub} from './db.js';

const client = new tmi.Client({
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

client.on('message', (channel, userstate, message) => {
	// handle message
});

Promise
	.all([
		redisSub.connect(),
		redisPub.connect(),
	])
	.then(async () => {
		const tmiClient = new TmiClient({
			redis: {
				sub: redisSub,
				pub: redisPub,
			},
			database,
			tmiClient: client,
			channelDistributor: RedisChannelDistributor,
		});

		console.log(`[Bot] [${process.env.PROCESS_ID}] ready.`);

		tmiClient.on('tmi.join', (channel) => {
			console.log(`[Bot] [${process.env.PROCESS_ID}] joined ${channel}.`);
		});

		tmiClient.on('tmi.part', (channel) => {
			console.log(`[Bot] [${process.env.PROCESS_ID}] parted ${channel}.`);
		});

		client.connect();
	});