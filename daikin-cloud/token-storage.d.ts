import type { TokenSet } from './types';
declare const TOKEN_FILE_MODE = 384;
declare function loadTokenFromFile(filePath: string): TokenSet | null;
declare function saveTokenToFile(filePath: string, tokenSet: TokenSet): void;
declare function deleteTokenFile(filePath: string): void;
export { loadTokenFromFile, saveTokenToFile, deleteTokenFile, TOKEN_FILE_MODE, };
