import winston from "winston";

function loadLogger() {
    const logger = winston.createLogger({
        level: "info",
        format: winston.format.json(),
        transports: [
            new winston.transports.File({ filename: 'log/error.log', level: 'error' }),
            new winston.transports.File({ filename: 'log/combined.log' }),
        ],
    });

    if (process.env.NODE_ENV !== 'production' || config.system.jeedom) {
        logger.add(new winston.transports.Console({
            format: winston.format.simple(),
        }));
    }

    return logger;
}


export {
    loadLogger
}
