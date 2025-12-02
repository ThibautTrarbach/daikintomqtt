"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadLogger = loadLogger;
const winston_1 = __importDefault(require("winston"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const { combine, timestamp, printf, colorize, align } = winston_1.default.format;
function loadLogger() {
    const logDir = path_1.default.join(process.cwd(), 'log');
    if (!fs_1.default.existsSync(logDir)) {
        fs_1.default.mkdirSync(logDir, { recursive: true });
    }
    const logger = winston_1.default.createLogger({
        level: "info",
        format: winston_1.default.format.json(),
        transports: [
            new winston_1.default.transports.File({
                filename: path_1.default.join(logDir, 'error.log'),
                level: 'error',
                maxsize: 10485760,
                maxFiles: 5,
                tailable: true
            }),
            new winston_1.default.transports.File({
                filename: path_1.default.join(logDir, 'combined.log'),
                maxsize: 10485760,
                maxFiles: 5,
                tailable: true
            }),
            new winston_1.default.transports.File({
                filename: path_1.default.join(logDir, 'debug.log'),
                level: 'debug',
                maxsize: 10485760,
                maxFiles: 5,
                tailable: true
            }),
        ],
        exceptionHandlers: [
            new winston_1.default.transports.File({ filename: path_1.default.join(logDir, 'exceptions.log') })
        ],
        rejectionHandlers: [
            new winston_1.default.transports.File({ filename: path_1.default.join(logDir, 'rejections.log') })
        ],
    });
    const shouldAddConsole = process.env.NODE_ENV !== 'production' ||
        (typeof global.config !== 'undefined' && global.config?.integration?.jeedom);
    if (shouldAddConsole) {
        logger.add(new winston_1.default.transports.Console({
            format: combine(timestamp({
                format: 'YYYY-MM-DD HH:mm:ss.SSS',
            }), align(), printf((info) => {
                const level = info.level.toUpperCase().padEnd(5);
                return `[${info.timestamp}] ${level}: ${info.message}`;
            })),
        }));
    }
    return logger;
}
//# sourceMappingURL=logger.js.map