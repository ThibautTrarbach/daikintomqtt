"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOKEN_FILE_MODE = void 0;
exports.loadTokenFromFile = loadTokenFromFile;
exports.saveTokenToFile = saveTokenToFile;
exports.deleteTokenFile = deleteTokenFile;
const fs = __importStar(require("node:fs"));
const TOKEN_FILE_MODE = 0o600;
exports.TOKEN_FILE_MODE = TOKEN_FILE_MODE;
function loadTokenFromFile(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            const data = fs.readFileSync(filePath, 'utf8');
            const parsed = JSON.parse(data);
            if (parsed && typeof parsed.access_token === 'string') {
                if (parsed.expires_in && !parsed.expires_at) {
                    parsed.expires_at = Math.floor(Date.now() / 1000) + parsed.expires_in;
                }
                return parsed;
            }
        }
    }
    catch {
    }
    return null;
}
function saveTokenToFile(filePath, tokenSet) {
    fs.writeFileSync(filePath, JSON.stringify(tokenSet, null, 2), {
        encoding: 'utf8',
        mode: TOKEN_FILE_MODE,
    });
}
function deleteTokenFile(filePath) {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
    catch {
    }
}
//# sourceMappingURL=token-storage.js.map