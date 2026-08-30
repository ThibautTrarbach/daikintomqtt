import winston from "winston";
import fs from "fs";
import path from "path";
const { combine, timestamp, printf, align } = winston.format;

function loadLogger() {
	const logDir = path.join(global.datadir || process.cwd() + '/config', 'log');
	if (!fs.existsSync(logDir)) {
		fs.mkdirSync(logDir, { recursive: true });
	}

	const logger = winston.createLogger({
		level: "info",
		format: winston.format.json(),
		transports: [
			new winston.transports.File({
				filename: path.join(logDir, 'error.log'),
				level: 'error',
				maxsize: 10485760,
				maxFiles: 5,
				tailable: true
			}),
			new winston.transports.File({
				filename: path.join(logDir, 'combined.log'),
				maxsize: 10485760,
				maxFiles: 5,
				tailable: true
			}),
		],
		exceptionHandlers: [
			new winston.transports.File({ filename: path.join(logDir, 'exceptions.log') })
		],
		rejectionHandlers: [
			new winston.transports.File({ filename: path.join(logDir, 'rejections.log') })
		],
	});

	const shouldAddConsole = process.env.NODE_ENV !== 'production' ||
	                         (typeof global.config !== 'undefined' && global.config?.integration?.jeedom);

	if (shouldAddConsole) {
		logger.add(new winston.transports.Console({
			format: combine(
				timestamp({
					format: 'YYYY-MM-DD HH:mm:ss.SSS',
				}),
				align(),
				printf((info) => {
					const level = info.level.toUpperCase().padEnd(5);
					return `[${info.timestamp}] ${level}: ${info.message}`;
				})
			),
		}));
	}

	return logger;
}

export {
	loadLogger
}
