import { Launcher } from 'comp/launcher';
import { IoFileCache } from 'storage/io-file-cache';
import { IoBrowserCache } from 'storage/io-browser-cache';

const IoCache = Launcher ? IoFileCache : IoBrowserCache;

export { IoCache };
