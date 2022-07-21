import {RedisChannelDistributor, Supervisor} from 'tmi.js-cluster';
import {database, redisPub, redisSub} from './db.js';

Promise
	.all([
		redisSub.connect(),
		redisPub.connect(),
	])
	.then(() => {
		const manager = new Supervisor({
			redis: {
				sub: redisSub,
				pub: redisPub,
			},
			database,
			channelDistributor: RedisChannelDistributor,
		}, {
			file: __dirname + '/bot.js',
			autoScale: {
				processes: {
					min: 1,
					max: 5,
				},
				thresholds: {
					channels: 200,
					scaleUp: 80,
					scaleDown: 30,
				},
			},
			throttle: {
				join: {
					allow: 2_000,
					// every 1s take 2 channels is only recommend for the pub/sub system.
					every: 1,
					take: 2,
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