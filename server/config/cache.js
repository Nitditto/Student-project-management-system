import redisClient from "./redisClient.js";

/** 
 * Get data from cache, or fetch it from DB when not found in cache.
 * @param {string} key - the Redis key
 * @param {function} fetchFn - Async database query function
 * @param {number} ttl - Time-to-live in seconds
 */

export const getOrCache = async(key, fetchFn, ttl = 3600) => {
    try{
        const cached = await redisClient.get(key);
        if(cached) {
            console.log(`Cached hit for key: ${key}`);
            return JSON.parse(cached);
        }
    }catch(err) {
        console.error(`[Redis Get Error] : ${err.message}`);
    }
    // Cache miss -> Query database
    console.log(`[Cache Miss] Querying DB for key ${key}`);

    const freshData = await fetchFn();

    try {
        await redisClient.setEx(key, ttl, JSON.stringify(freshData));
        console.log(`[Cache Set] Populated for ${key}`);
    }catch(err){
        console.error(`[Redis Set Error] : ${key}`, err);
    }
    
    return freshData;
}

/**
 * Delete a cache key
 * @param {string} key - Redis key to be deleted
 */

export const invalidateCache = async(key) => {
    try {
        await redisClient.del(key);
        console.log(`[Cache Invalidated] Key: ${key}`);
    }catch(err){
        console.error(`[Cache Delete Error] Key : ${key}`, err);
    }
}