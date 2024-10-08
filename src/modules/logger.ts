import winston from "winston";
const { combine, timestamp, printf, colorize, align } = winston.format;

function loadLogger() {
	const logger = winston.createLogger({
		level: "info",
		format: winston.format.json(),
		transports: [
			new winston.transports.File({filename: 'log/error.log', level: 'error'}),
			new winston.transports.File({filename: 'log/combined.log'}),
		],
	});

	if (process.env.NODE_ENV !== 'production' || config.system.jeedom) {
		logger.add(new winston.transports.Console({
			format: combine(
				timestamp({
					format: 'YYYY-MM-DD HH:mm:ss.SSS',
				}),
				align(),
				printf((info) => `[${info.timestamp}] ${info.level}: ${info.message}`)
			),
		}));
	}

	return logger;
}

export {
	loadLogger
}
