const { createClient } = require('redis');
const axios = require('axios');
const mysql = require('mysql');
const { channelSanitize } = require('tmi.js-cluster/src/lib/util');

if (!process.env.REDIS_URL) {
	require('dotenv').config();
}

let maxChannels = process.env.MAX_CHANNELS || 300;

const twitchClientId = process.env.TWITCH_CLIENT_ID;
const twitchClientSecret = process.env.TWITCH_CLIENT_SECRET;

let twitchClientTokenKey = 'tmi-cluster-test-client-token';

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
	url: `redis://${process.env.REDIS_URL}`,
});

let updating = false;

async function checkOffline(channels) {
	let token = await redisClient.get(twitchClientTokenKey);

	channels = channels.map((channel) => (channel[0] === '#' ? channel.substring(1) : channel).toLowerCase());

	return axios
		.get('https://api.twitch.tv/helix/streams', {
			headers: {
				'Client-ID': twitchClientId, Authorization: `Bearer ${token}`,
			}, params: {
				user_login: channels,
			},
		})
		.then(({ data }) => {
			const online = [];
			for (const stream of data.data) {
				online.push(stream.user_login.toLowerCase());
			}

			return channels.filter((channelName) => {
				return !online.includes(channelName);
			});
		});
}

async function getCurrentStreams(pagination = null) {
	let token = await redisClient.get(twitchClientTokenKey);

	return axios
		.get('https://api.twitch.tv/helix/streams', {
			headers: {
				'Client-ID': twitchClientId, Authorization: `Bearer ${token}`,
			}, params: {
				first: 100, language: 'de', after: pagination,
			},
		})
		.then(({ data }) => {
			data.data = data.data.map((channel) => {
				return {
					id: channel.id, user_id: channel.user_id, user_login: channel.user_login, user_name: channel.user_name,
				};
			});

			return data;
		});
}

async function renewTwitchToken() {
	let token = await redisClient.get(twitchClientTokenKey);

	if (!token) {
		const { data } = await axios.post('https://id.twitch.tv/oauth2/token', {
			grant_type: 'client_credentials', client_id: twitchClientId, client_secret: twitchClientSecret,
		});

		await redisClient.set(twitchClientTokenKey, data.access_token, {
			EX: data.expires_in,
		});

		console.log('[Twitch] new token generated:', data.access_token);
	}
}

async function updateChannels() {
	if (process.env.ENABLED !== 'true') {
		console.log('Channel manager currently disabled');
		return;
	}

	updating = true;

	try {
		await renewTwitchToken();

		const processes = await new Promise((resolve) => {
			db.query('SELECT * FROM tmi_cluster_supervisor_processes;', (error, results) => {
				const channels = [];
				for (const result of results) {
					const processChannels = JSON.parse(result.channels);
					channels.push(...processChannels);
				}

				resolve({ channels, processes: results });
			});
		});

		const currentChannels = processes.channels.slice();
		const leaveChannels = [];
		do {
			const check = currentChannels.splice(0, 100);
			const offline = await checkOffline(check);

			leaveChannels.push(...offline);
		} while (currentChannels.length);

		console.log(`Leaving ${leaveChannels.length} channels.`);

		for (const username of leaveChannels) {
			const index = processes.channels.indexOf(channelSanitize(username));
			if (index >= 0) {
				processes.channels.splice(index, 1);
			}
		}

		await joinHandler(leaveChannels, 'part');

		if (processes.channels >= maxChannels) {
			console.log('Enough channels, no join required.');
			return;
		}

		let pagination = null;
		const joinChannels = [];

		while (processes.channels.length < maxChannels) {
			const result = await getCurrentStreams(pagination);
			pagination = result.pagination.cursor;

			const newChannels = result.data
			                          .filter((channel) => {
				                          return !processes.channels.includes(channelSanitize(channel.user_login));
			                          })
			                          .map((channel) => channel.user_login)
			                          .splice(0, maxChannels - processes.channels.length);

			joinChannels.push(...newChannels);
			processes.channels.push(...newChannels);
		}

		await joinHandler(joinChannels);

		console.log(`Joining ${joinChannels.length} channels.`);
	}
	catch (error) {
		console.log('Update channels failed:', error);
	}

	updating = false;
}

async function joinHandler(channels, command = 'join') {
	await redisClient.rPush('tmi-cluster:commands:join-handler', JSON.stringify({
		command, time: Date.now(), options: {
			channels,
		},
	}));
}

redisClient
	.connect()
	.then(async () => {
		console.log('[Redis] connected.');

		updateChannels();

		setInterval(() => {
			updateChannels();
		}, 300_000);
	})
	.catch((error) => {
		console.log(`Can't connect to redis:`, error.message);
		process.exit(1);
	});