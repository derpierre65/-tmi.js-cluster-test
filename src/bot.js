import tmi from 'tmi.js';
import {RedisChannelDistributor, TmiClient} from 'tmi.js-cluster';
import {database, redisPub, redisSub} from './db.js';

// you can use a promise
function createClient(options) {
	return Promise.resolve(new tmi.Client({
		connection: {
			secure: true,
			reconnect: false,
			reconnectDecay: 1,
			reconnectInterval: 10000,
		},
		identity: {
			username: options.username,
			password: options.password,
		},
	}));
}

Promise
	.all([
		redisSub.connect(),
		redisPub.connect(),
	])
	.then(async () => {
		const tmiClient = await createClient({
			username: process.env.TMI_USERNAME,
			password: process.env.TMI_PASSWORD,
		});

		const tmiClusterClient = new TmiClient({
			redis: {
				sub: redisSub,
				pub: redisPub,
			},
			channelDistributor: RedisChannelDistributor,
			database,
			tmiClient,
		}, {
			createClient,
		});

		console.log(`[Bot] [${process.env.PROCESS_ID}] ready.`);

		tmiClusterClient.on('tmi.join', (error, channel) => {
			if (error) {
				console.log('Fail to join', channel, error);
				return;
			}

			console.log(`[Bot] [${process.env.PROCESS_ID}] joined ${channel}.`);
		});

		tmiClusterClient.on('tmi.part', (error, channel) => {
			if (error) {
				console.log('Fail to part', channel);
				return;
			}

			console.log(`[Bot] [${process.env.PROCESS_ID}] parted ${channel}.`);
		});

		// new tmi.js client created (includes the main client)
		// username is `null` for the main client otherwise the bot name.
		tmiClusterClient.on('tmi.client.created', (error, username, client) => {
			if (error) {
				console.error('tmi.client.created failed', error);
				return;
			}
			console.log('tmi.client.created:', username);

			client.on('message', (channel, userstate, message) => {
				console.log(client.username, channel, message);
				// console.log('new message:', channel);
			});

			client.connect();

			if (username) {
				console.log(`[Bot] [${process.env.PROCESS_ID}] created client ${username}.`);
			}
		});

		tmiClusterClient.on('tmi.client.deleted', (username, client) => {
			console.log('tmi.client.deleted:', username);

			// if you have saved the client variable everywhere you should delete it to prevent memory leak
			// best case is to use tmiClusterClient.clients[username] for any action.
			// after this event tmiClusterClient.clients[username] will be undefined.

			console.log(`[Bot] [${process.env.PROCESS_ID}] deleted client ${username}.`);
		});

		// initial everything
		tmiClusterClient.start();
	});