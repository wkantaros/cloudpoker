const shortid = require('shortid');
const cookie = require('cookie');

const PLAYER_UUID_COOKIE_NAME = "plar_uuid";
module.exports.PLAYER_UUID_COOKIE_NAME = PLAYER_UUID_COOKIE_NAME;
// Player UUIDs expire after 48 hours
const PLAYER_UUID_EXPIRY = 48 * 60 * 60 * 1000;
module.exports.PLAYER_UUID_EXPIRY=PLAYER_UUID_EXPIRY;
function playerIdFromRequest(req) {
    return req.cookies[PLAYER_UUID_COOKIE_NAME];
}

module.exports.playerIdFromRequest = playerIdFromRequest;

function newPlayerId() {
    return shortid.generate();
}

module.exports.newPlayerId = newPlayerId;

function getOrSetPlayerIdCookie(req, res) {
    let playerId = playerIdFromRequest(req);

    console.log('playerIdFromRequest', playerId);
    if (!playerId) {
        // Create new player ID and set it as a cookie in user's browser
        playerId = newPlayerId();
        setPlayerIdCookie(playerId, req.params.id, res);
    }
    return playerId;
}
module.exports.getOrSetPlayerIdCookie = getOrSetPlayerIdCookie;

function cookieOptions(sessionId) {
    return {
        // Make the player ID unique to this table by using the table's path
        // path: `/session/${sessionId}`,
        maxAge: PLAYER_UUID_EXPIRY,
        sameSite: 'lax', // idk if we should do strict
        httpOnly: true,
    }
}
module.exports.cookieOptions = cookieOptions;

function setPlayerIdCookie(pid, sessionId, res) {
    res.setHeader('Set-Cookie', cookie.serialize(PLAYER_UUID_COOKIE_NAME, pid, cookieOptions(sessionId)));
}
module.exports.setPlayerIdCookie = setPlayerIdCookie

function TwoWayMap() {
    // maps player ID (from cookie) -> socket ID (from socket.io session)
    this.kv = new Map();
    // maps socket ID -> player ID
    this.vk = new Map();
}

TwoWayMap.prototype.set = function(k, v) {
    this.kv.set(k, v);
    this.vk.set(v, k);
};

TwoWayMap.prototype.key = function(k) {
    return this.kv.get(k)
};

TwoWayMap.prototype.val = function(v) {
    return this.vk.get(v)
};

TwoWayMap.prototype.clear = function() {
    this.kv.clear();
    this.vk.clear()
};

TwoWayMap.prototype.deleteKey = function(k) {
    this.vk.delete(this.kv.get(k));
    this.kv.delete(k);
};

TwoWayMap.prototype.hasKey = function(k) {
    return this.kv.has(k)
};

TwoWayMap.prototype.hasValue = function(v) {
    return this.vk.has(v)
};

TwoWayMap.prototype.getKv = function() {
    return this.kv
};

TwoWayMap.prototype.getVk = function() {
    return this.vk
};
module.exports.TwoWayMap = TwoWayMap;