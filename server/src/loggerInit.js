const pino = require('pino');
if (!process.env.PKR_LOG || process.env.PKR_LOG.length < 1) {
    process.env.PKR_LOG = './poker.log'
}
pino({})
const logger = pino({
    timestamp: false,
    base: null,
    formatters: {
        bindings (bindings) {
            return null
        },
        level (label, number) {
            return null
        },
    }
}, pino.destination({
    dest: process.env.PKR_LOG, // omit for stdout
    minLength: 4096, // Buffer before writing
    sync: false, // Asynchronous logging
}));
class TableLogger {
    static addPlayer (sid, playerName, playerId) {
        logger.info({sid: sid, op: 'addPlayer', playerName: playerName, playerId: playerId});
    }
    static delPlayer (sid, playerName) {
        logger.info({sid: sid, op: 'delPlayer', playerName: playerName});
    }
    static newRound(sid, redisArgs) {
        logger.info(redisFieldsToLogInfo(sid, 'newRound', redisArgs));
    }
    static playerState(sid, redisArgs) {
        logger.info(redisFieldsToLogInfo(sid, 'playerState', redisArgs));
    }
    static addOp(sid, op, redisArgs) {
        logger.info(redisFieldsToLogInfo(sid, op, redisArgs));
    }
    static action(sid, redisArgs) {
        logger.info(redisFieldsToLogInfo(sid, 'action', redisArgs));
    }
}
function redisFieldsToLogInfo(sid, op, redisArgs) {
    let loggedInfo = {sid: sid, op: op};
    for (let i = 0; i < redisArgs.length; i+=2) {
        loggedInfo[redisArgs[i]] = redisArgs[i+1];
    }
    return loggedInfo;
}
module.exports.TableLogger = TableLogger;
