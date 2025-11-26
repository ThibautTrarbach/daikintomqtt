import winston from "winston";
import fs from "fs";
import path from "path";
const { combine, timestamp, printf, colorize, align } = winston.format;

function loadLogger() {
	// Créer le répertoire de logs s'il n'existe pas
	const logDir = path.join(process.cwd(), 'log');
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
				maxsize: 10485760, // 10MB
				maxFiles: 5,
				tailable: true
			}),
			new winston.transports.File({
				filename: path.join(logDir, 'combined.log'),
				maxsize: 10485760, // 10MB
				maxFiles: 5,
				tailable: true
			}),
			new winston.transports.File({
				filename: path.join(logDir, 'debug.log'),
				level: 'debug',
				maxsize: 10485760, // 10MB
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

	// Toujours ajouter la console en développement, ou si config n'est pas encore chargé
	// La config sera mise à jour après le chargement dans config.ts
	const shouldAddConsole = process.env.NODE_ENV !== 'production' || 
	                         (typeof global.config !== 'undefined' && global.config?.system?.jeedom);

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
