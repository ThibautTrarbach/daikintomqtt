"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadLogger = void 0;
const winston_1 = __importDefault(require("winston"));
function loadLogger() {
    const logger = winston_1.default.createLogger({
        level: "info",
        format: winston_1.default.format.json(),
        transports: [
            new winston_1.default.transports.File({ filename: 'log/error.log', level: 'error' }),
            new winston_1.default.transports.File({ filename: 'log/combined.log' }),
        ],
    });
    if (process.env.NODE_ENV !== 'production' || config.system.jeedom) {
        logger.add(new winston_1.default.transports.Console({
            format: winston_1.default.format.simple(),
        }));
    }
    return logger;
}
exports.loadLogger = loadLogger;
