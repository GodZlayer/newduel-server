// @ts-nocheck
// Entry point for Nakama runtime registration.
function InitModule(ctx, logger, nk, initializer) {
    logger.info("NewDuel runtime loaded");
    initializer.registerRpc("Register2FAStart", rpcRegister2FAStart, true);
    initializer.registerRpc("Register2FAVerify", rpcRegister2FAVerify, true);
    initializer.registerRpc("GetMyCharacters", rpcGetMyCharacters);
    initializer.registerRpc("CreateCharacter", rpcCreateCharacter);
    initializer.registerRpc("DeleteCharacter", rpcDeleteCharacter);
    initializer.registerRpc("SelectCharacter", rpcSelectCharacter);
    initializer.registerRpc("FriendsList", rpcFriendsList);
    initializer.registerRpc("FriendRequests", rpcFriendRequests);
    initializer.registerRpc("FriendAdd", rpcFriendAdd);
    initializer.registerRpc("FriendAccept", rpcFriendAccept);
    initializer.registerRpc("FriendDecline", rpcFriendDecline);
    initializer.registerRpc("FriendsChatSend", rpcFriendsChatSend);
    initializer.registerRpc("FriendsChatHistory", rpcFriendsChatHistory);
    initializer.registerRpc("CreateRoom", rpcCreateRoom);
    initializer.registerRpc("JoinRoom", rpcJoinRoom);
    initializer.registerRpc("LeaveRoom", rpcLeaveRoom);
    initializer.registerRpc("Ready", rpcReady);
    initializer.registerRpc("Unready", rpcUnready);
    initializer.registerRpc("SetRoomBet", rpcSetRoomBet);
    initializer.registerRpc("DepositBet", rpcDepositBet);
    initializer.registerRpc("StartRoomMatch", rpcStartRoomMatch);
    initializer.registerRpc("MarketListItem", rpcMarketListItem);
    initializer.registerRpc("MarketCancel", rpcMarketCancel);
    initializer.registerRpc("MarketBuy", rpcMarketBuy);
    initializer.registerRpc("ResetBuildWithGold", rpcResetBuildWithGold);
    initializer.registerRpc("ConvertSpoilsToGold", rpcConvertSpoilsToGold);
    initializer.registerRpc("GuildCraft", rpcGuildCraft);
    initializer.registerRpc("GuildUpgrade", rpcGuildUpgrade);
    // Match registration disabled temporarily while stabilizing runtime JS.
    // initializer.registerMatch("pve_match", pveMatch);
    // initializer.registerMatch("pvp_match", pvpMatch);
    // initializer.registerMatch("hybrid_match", hybridMatch);
    // initializer.registerMatch("ranked_match", rankedMatch);
    initializer.registerBeforeAuthenticateCustom(beforeAuthenticateCustom);
    initializer.registerAfterAuthenticateCustom(afterAuthenticateCustom);
}
const COLLECTION_CHARACTERS = "characters";
const COLLECTION_PROFILE = "profiles";
const COLLECTION_ROOMS = "rooms";
const COLLECTION_MATCH_LOGS = "match_logs";
const COLLECTION_READY_CD = "ready_cd";
const COLLECTION_WALLET = "wallet";
const COLLECTION_PVP_PAIR = "pvp_pair_losses";
const COLLECTION_AUTH_PENDING = "auth_2fa_pending";
const COLLECTION_AUTH_SECRETS = "auth_2fa_secrets";
const COLLECTION_AUTH_LOGINS = "auth_2fa_logins";
const COLLECTION_AUTH_RATE = "auth_2fa_rate";
const COLLECTION_FRIENDS = "friends";
const COLLECTION_FRIEND_REQUESTS = "friend_requests";
const COLLECTION_FRIEND_CHAT = "friends_chat";
const SYSTEM_USER_ID = "00000000-0000-0000-0000-000000000000";
const SNAPSHOT_OP = 1;
const EVENT_OP = 2;
const RESULT_OP = 3;
const READY_COOLDOWN_MS = 3000;
function nowIso() {
    return new Date().toISOString();
}
function parsePayload(payload) {
    if (!payload) {
        throw new Error("payload required");
    }
    return JSON.parse(payload);
}
function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}
function friendChatKey(a, b) {
    return [a, b].sort().join(":");
}
function isUserInRoom(nk, userId) {
    const list = nk.storageList(SYSTEM_USER_ID, COLLECTION_ROOMS, 100);
    const rooms = (list === null || list === void 0 ? void 0 : list.objects) || [];
    return rooms.some((obj) => {
        const room = obj.value;
        return Array.isArray(room.members) && room.members.includes(userId);
    });
}
function ensureUser(ctx) {
    if (!ctx.userId) {
        throw new Error("unauthorized");
    }
    return ctx.userId;
}
function getRoomCapacity(mode) {
    if (mode === "pvp_1v1") {
        return 2;
    }
    return 2;
}
function readRoom(nk, roomId) {
    const records = nk.storageRead([
        { collection: COLLECTION_ROOMS, key: roomId, userId: SYSTEM_USER_ID },
    ]);
    if (!records || records.length === 0) {
        throw new Error("room not found");
    }
    const record = records[0];
    return { room: record.value, version: record.version };
}
function writeRoom(nk, room, version) {
    nk.storageWrite([
        {
            collection: COLLECTION_ROOMS,
            key: room.roomId,
            userId: SYSTEM_USER_ID,
            value: room,
            version,
        },
    ]);
}
function deleteRoom(nk, roomId) {
    nk.storageDelete([{ collection: COLLECTION_ROOMS, key: roomId, userId: SYSTEM_USER_ID }]);
}
function updateReadyCooldown(nk, userId, roomId) {
    const key = `${roomId}:${userId}`;
    const nowMs = Date.now();
    const records = nk.storageRead([{ collection: COLLECTION_READY_CD, key, userId }]);
    if (records.length > 0) {
        const lastAt = records[0].value.lastAt;
        if (nowMs - lastAt < READY_COOLDOWN_MS) {
            throw new Error("ready cooldown");
        }
    }
    nk.storageWrite([
        {
            collection: COLLECTION_READY_CD,
            key,
            userId,
            value: { lastAt: nowMs },
        },
    ]);
}
function readWallet(nk, userId) {
    const records = nk.storageRead([
        { collection: COLLECTION_WALLET, key: "wallet", userId },
    ]);
    if (!records || records.length === 0) {
        const wallet = { gold: 0, spoils: {} };
        nk.storageWrite([
            { collection: COLLECTION_WALLET, key: "wallet", userId, value: wallet },
        ]);
        return wallet;
    }
    return records[0].value;
}
function writeWallet(nk, userId, wallet) {
    nk.storageWrite([
        { collection: COLLECTION_WALLET, key: "wallet", userId, value: wallet },
    ]);
}
function getPairKey(userA, userB) {
    return userA < userB ? `${userA}:${userB}` : `${userB}:${userA}`;
}
function readPairLosses(nk, userA, userB) {
    const key = getPairKey(userA, userB);
    const records = nk.storageRead([{ collection: COLLECTION_PVP_PAIR, key, userId: SYSTEM_USER_ID }]);
    if (!records || records.length === 0) {
        return { losses: {} };
    }
    return records[0].value;
}
function writePairLosses(nk, userA, userB, data) {
    const key = getPairKey(userA, userB);
    nk.storageWrite([
        {
            collection: COLLECTION_PVP_PAIR,
            key,
            userId: SYSTEM_USER_ID,
            value: { ...data, updatedAt: Date.now() },
        },
    ]);
}
function generateBase32Secret() {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    const bytes = randomBytes(20);
    let bits = 0;
    let value = 0;
    let output = "";
    for (const byte of bytes) {
        value = (value << 8) | byte;
        bits += 8;
        while (bits >= 5) {
            output += alphabet[(value >>> (bits - 5)) & 31];
            bits -= 5;
        }
    }
    if (bits > 0) {
        output += alphabet[(value << (5 - bits)) & 31];
    }
    return output;
}
function generateToken() {
    const bytes = randomBytes(24);
    let out = "";
    for (const b of bytes) {
        out += b.toString(16).padStart(2, "0");
    }
    return out;
}
function base32ToBytes(input) {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let bits = 0;
    let value = 0;
    const output = [];
    for (const char of input.toUpperCase().replace(/=+$/, "")) {
        const index = alphabet.indexOf(char);
        if (index === -1) {
            continue;
        }
        value = (value << 5) | index;
        bits += 5;
        if (bits >= 8) {
            output.push((value >>> (bits - 8)) & 255);
            bits -= 8;
        }
    }
    return new Uint8Array(output);
}
function randomBytes(length) {
    const bytes = new Uint8Array(length);
    for (let i = 0; i < length; i += 1) {
        bytes[i] = Math.floor(Math.random() * 256);
    }
    return bytes;
}
function sha1(message) {
    const words = [];
    for (let i = 0; i < message.length; i += 1) {
        words[i >> 2] |= message[i] << (24 - (i % 4) * 8);
    }
    const bitLength = message.length * 8;
    words[bitLength >> 5] |= 0x80 << (24 - (bitLength % 32));
    words[(((bitLength + 64) >> 9) << 4) + 15] = bitLength;
    let h0 = 0x67452301;
    let h1 = 0xefcdab89;
    let h2 = 0x98badcfe;
    let h3 = 0x10325476;
    let h4 = 0xc3d2e1f0;
    const w = new Array(80);
    for (let i = 0; i < words.length; i += 16) {
        for (let j = 0; j < 16; j += 1) {
            w[j] = words[i + j] | 0;
        }
        for (let j = 16; j < 80; j += 1) {
            w[j] = rol(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1);
        }
        let a = h0;
        let b = h1;
        let c = h2;
        let d = h3;
        let e = h4;
        for (let j = 0; j < 80; j += 1) {
            let f = 0;
            let k = 0;
            if (j < 20) {
                f = (b & c) | (~b & d);
                k = 0x5a827999;
            }
            else if (j < 40) {
                f = b ^ c ^ d;
                k = 0x6ed9eba1;
            }
            else if (j < 60) {
                f = (b & c) | (b & d) | (c & d);
                k = 0x8f1bbcdc;
            }
            else {
                f = b ^ c ^ d;
                k = 0xca62c1d6;
            }
            const temp = (rol(a, 5) + f + e + k + w[j]) | 0;
            e = d;
            d = c;
            c = rol(b, 30);
            b = a;
            a = temp;
        }
        h0 = (h0 + a) | 0;
        h1 = (h1 + b) | 0;
        h2 = (h2 + c) | 0;
        h3 = (h3 + d) | 0;
        h4 = (h4 + e) | 0;
    }
    const out = new Uint8Array(20);
    const digest = [h0, h1, h2, h3, h4];
    for (let i = 0; i < digest.length; i += 1) {
        out[i * 4] = (digest[i] >>> 24) & 0xff;
        out[i * 4 + 1] = (digest[i] >>> 16) & 0xff;
        out[i * 4 + 2] = (digest[i] >>> 8) & 0xff;
        out[i * 4 + 3] = digest[i] & 0xff;
    }
    return out;
}
function hmacSha1(key, msg) {
    const blockSize = 64;
    let keyBytes = key;
    if (keyBytes.length > blockSize) {
        keyBytes = sha1(keyBytes);
    }
    if (keyBytes.length < blockSize) {
        const padded = new Uint8Array(blockSize);
        padded.set(keyBytes);
        keyBytes = padded;
    }
    const oKey = new Uint8Array(blockSize);
    const iKey = new Uint8Array(blockSize);
    for (let i = 0; i < blockSize; i += 1) {
        oKey[i] = keyBytes[i] ^ 0x5c;
        iKey[i] = keyBytes[i] ^ 0x36;
    }
    const inner = sha1(concatBytes(iKey, msg));
    return sha1(concatBytes(oKey, inner));
}
function concatBytes(a, b) {
    const out = new Uint8Array(a.length + b.length);
    out.set(a, 0);
    out.set(b, a.length);
    return out;
}
function rol(value, bits) {
    return (value << bits) | (value >>> (32 - bits));
}
function totp(secret, windowSeconds = 30, digits = 6, forTime) {
    const time = forTime !== null && forTime !== void 0 ? forTime : Math.floor(Date.now() / 1000);
    const counter = Math.floor(time / windowSeconds);
    const msg = new Uint8Array(8);
    let tmp = counter;
    for (let i = 7; i >= 0; i -= 1) {
        msg[i] = tmp & 0xff;
        tmp >>= 8;
    }
    const key = base32ToBytes(secret);
    const hash = hmacSha1(key, msg);
    const offset = hash[hash.length - 1] & 0x0f;
    const binary = ((hash[offset] & 0x7f) << 24) |
        ((hash[offset + 1] & 0xff) << 16) |
        ((hash[offset + 2] & 0xff) << 8) |
        (hash[offset + 3] & 0xff);
    const otp = binary % 10 ** digits;
    return otp.toString().padStart(digits, "0");
}
function verifyTotp(secret, code) {
    const now = Math.floor(Date.now() / 1000);
    const current = totp(secret, 30, 6, now);
    const previous = totp(secret, 30, 6, now - 30);
    const next = totp(secret, 30, 6, now + 30);
    return code === current || code === previous || code === next;
}
function otpauthUri(login, secret) {
    const issuer = "NewDuel";
    const label = encodeURIComponent(`${issuer}:${login}`);
    const query = `secret=${secret}&issuer=${encodeURIComponent(issuer)}`;
    return `otpauth://totp/${label}?${query}`;
}
function readPending2FA(nk, login) {
    const records = nk.storageRead([
        { collection: COLLECTION_AUTH_PENDING, key: login, userId: SYSTEM_USER_ID },
    ]);
    if (!records || records.length === 0) {
        return null;
    }
    return records[0].value;
}
function writePending2FA(nk, pending) {
    nk.storageWrite([
        { collection: COLLECTION_AUTH_PENDING, key: pending.login, userId: SYSTEM_USER_ID, value: pending },
    ]);
}
function deletePending2FA(nk, login) {
    nk.storageDelete([{ collection: COLLECTION_AUTH_PENDING, key: login, userId: SYSTEM_USER_ID }]);
}
function checkRateLimit(nk, key, limit, windowMs) {
    const now = Date.now();
    const records = nk.storageRead([
        { collection: COLLECTION_AUTH_RATE, key, userId: SYSTEM_USER_ID },
    ]);
    let entry = { count: 0, windowStart: now };
    if (records && records.length > 0) {
        entry = records[0].value;
    }
    if (entry.blockedUntil && entry.blockedUntil > now) {
        throw new Error("rate limited");
    }
    if (now - entry.windowStart > windowMs) {
        entry = { count: 0, windowStart: now };
    }
    entry.count += 1;
    if (entry.count > limit) {
        entry.blockedUntil = now + windowMs;
        nk.storageWrite([
            { collection: COLLECTION_AUTH_RATE, key, userId: SYSTEM_USER_ID, value: entry },
        ]);
        throw new Error("rate limited");
    }
    nk.storageWrite([
        { collection: COLLECTION_AUTH_RATE, key, userId: SYSTEM_USER_ID, value: entry },
    ]);
}
function loginExists(nk, login) {
    const records = nk.storageRead([
        { collection: COLLECTION_AUTH_LOGINS, key: login, userId: SYSTEM_USER_ID },
    ]);
    if (records.length > 0) {
        return true;
    }
    return Boolean(findUserIdByUsername(nk, login));
}
function saveLoginMapping(nk, login, userId) {
    nk.storageWrite([
        {
            collection: COLLECTION_AUTH_LOGINS,
            key: login,
            userId: SYSTEM_USER_ID,
            value: { login, userId, createdAt: nowIso() },
        },
    ]);
}
function saveUserSecret(nk, userId, login, secret) {
    const record = { login, secret, createdAt: nowIso() };
    nk.storageWrite([
        { collection: COLLECTION_AUTH_SECRETS, key: userId, userId, value: record },
    ]);
}
function readUserSecret(nk, userId) {
    if (!userId) {
        return null;
    }
    const records = nk.storageRead([
        { collection: COLLECTION_AUTH_SECRETS, key: userId, userId },
    ]);
    if (!records || records.length === 0) {
        return null;
    }
    return records[0].value;
}
function readLoginMapping(nk, login) {
    if (!login) {
        return null;
    }
    const records = nk.storageRead([
        { collection: COLLECTION_AUTH_LOGINS, key: login, userId: SYSTEM_USER_ID },
    ]);
    if (!records || records.length === 0) {
        return null;
    }
    return records[0].value;
}
function findUserIdByUsername(nk, login) {
    try {
        // @ts-ignore - runtime provides this method.
        const users = nk.usersGetUsername([login]);
        if (users && users.length > 0) {
            return users[0].id;
        }
    }
    catch (_error) {
        return null;
    }
    return null;
}
function ensureAccountForLogin(nk, login) {
    const existing = findUserIdByUsername(nk, login);
    if (existing) {
        return existing;
    }
    try {
        // @ts-ignore - runtime provides this method.
        if (typeof nk.usersCreate === "function") {
            const userId = nk.uuidv4();
            // @ts-ignore
            nk.usersCreate([{ id: userId, username: login, displayName: login }]);
            return userId;
        }
        else if (typeof nk.authenticateCustom === "function") {
            // @ts-ignore
            nk.authenticateCustom(login, login, true);
        }
    }
    catch (_error) {
        // Fall through to lookup.
    }
    const created = findUserIdByUsername(nk, login);
    if (!created) {
        throw new Error("account creation failed");
    }
    return created;
}
// RPCs
const rpcRegister2FAStart = (_ctx, _logger, nk, payload) => {
    const data = parsePayload(payload);
    if (!data.login || data.login.length < 3) {
        throw new Error("login required");
    }
    checkRateLimit(nk, `start:${data.login}`, 5, 60000);
    if (loginExists(nk, data.login)) {
        throw new Error("login already exists");
    }
    const pending = readPending2FA(nk, data.login);
    if (pending && pending.expiresAt > Date.now()) {
        return JSON.stringify({ otpauth: otpauthUri(data.login, pending.secret) });
    }
    const secret = generateBase32Secret();
    writePending2FA(nk, {
        login: data.login,
        secret,
        approved: false,
        expiresAt: Date.now() + 10 * 60 * 1000,
        attempts: 0,
        lastAttemptAt: 0,
    });
    return JSON.stringify({ otpauth: otpauthUri(data.login, secret) });
};
const rpcRegister2FAVerify = (ctx, _logger, nk, payload) => {
    var _a;
    const data = parsePayload(payload);
    if (!data.login || !data.code) {
        throw new Error("login and code required");
    }
    const ip = ctx.clientIp || "unknown";
    checkRateLimit(nk, `verify:${data.login}:${ip}`, 8, 60000);
    const pending = readPending2FA(nk, data.login);
    if (!pending || pending.expiresAt < Date.now()) {
        throw new Error("registration expired");
    }
    const now = Date.now();
    const attempts = ((_a = pending.attempts) !== null && _a !== void 0 ? _a : 0) + 1;
    if (pending.lastAttemptAt && now - pending.lastAttemptAt < 30000 && attempts > 5) {
        throw new Error("too many attempts");
    }
    pending.attempts = attempts;
    pending.lastAttemptAt = now;
    if (!verifyTotp(pending.secret, data.code)) {
        writePending2FA(nk, pending);
        throw new Error("invalid code");
    }
    pending.approved = true;
    pending.approveToken = generateToken();
    pending.approveTokenExpiresAt = now + 5 * 60 * 1000;
    writePending2FA(nk, pending);
    return JSON.stringify({ approved: true, created: false, token: pending.approveToken });
};
const rpcCreateCharacter = (ctx, _logger, nk, payload) => {
    const userId = ensureUser(ctx);
    const data = parsePayload(payload);
    const name = (data.name || "").trim();
    if (!name || name.length < 3) {
        throw new Error("name required");
    }
    const list = nk.storageList(userId, COLLECTION_CHARACTERS, 10);
    const existing = (list === null || list === void 0 ? void 0 : list.objects) || [];
    if (existing.length >= 1) {
        throw new Error("character limit reached");
    }
    const character = {
        id: `char_${nk.uuidv4()}`,
        name,
        level: 1,
        rank: 0,
        stats: { hp: 100, mp: 50, atk: 10, def: 5, spd: 5 },
        points: 0,
        buildHash: "base",
        createdAt: nowIso(),
    };
    nk.storageWrite([
        {
            collection: COLLECTION_CHARACTERS,
            key: character.id,
            userId,
            value: character,
        },
    ]);
    return JSON.stringify({ character });
};
const rpcDeleteCharacter = (ctx, _logger, nk, payload) => {
    const userId = ensureUser(ctx);
    const data = parsePayload(payload);
    const characterId = (data.characterId || "").trim();
    if (!characterId) {
        throw new Error("characterId required");
    }
    if (isUserInRoom(nk, userId)) {
        throw new Error("cannot delete while in room");
    }
    const records = nk.storageRead([
        { collection: COLLECTION_CHARACTERS, key: characterId, userId },
    ]);
    if (!records || records.length === 0) {
        throw new Error("character not found");
    }
    nk.storageDelete([
        { collection: COLLECTION_CHARACTERS, key: characterId, userId },
    ]);
    return JSON.stringify({ deleted: true, characterId });
};
const rpcFriendsList = (ctx, _logger, nk, _payload) => {
    var _a, _b;
    const userId = ensureUser(ctx);
    const list = nk.storageList(userId, COLLECTION_FRIENDS, 200);
    const friends = (_b = (_a = list === null || list === void 0 ? void 0 : list.objects) === null || _a === void 0 ? void 0 : _a.map((obj) => obj.value)) !== null && _b !== void 0 ? _b : [];
    return JSON.stringify({ friends });
};
const rpcFriendRequests = (ctx, _logger, nk, _payload) => {
    var _a, _b;
    const userId = ensureUser(ctx);
    const list = nk.storageList(userId, COLLECTION_FRIEND_REQUESTS, 200);
    const requests = (_b = (_a = list === null || list === void 0 ? void 0 : list.objects) === null || _a === void 0 ? void 0 : _a.map((obj) => obj.value)) !== null && _b !== void 0 ? _b : [];
    return JSON.stringify({ requests });
};
const rpcFriendAdd = (ctx, _logger, nk, payload) => {
    const userId = ensureUser(ctx);
    const data = parsePayload(payload);
    const username = (data.username || "").trim();
    if (!username) {
        throw new Error("username required");
    }
    const users = nk.usersGetUsername([username]);
    if (!users || users.length === 0) {
        throw new Error("user not found");
    }
    const target = users[0];
    if (target.id === userId) {
        throw new Error("cannot add self");
    }
    const existing = nk.storageRead([
        { collection: COLLECTION_FRIENDS, key: target.id, userId },
    ]);
    if (existing && existing.length > 0) {
        return JSON.stringify({ status: "already" });
    }
    const incoming = nk.storageRead([
        { collection: COLLECTION_FRIEND_REQUESTS, key: target.id, userId },
    ]);
    if (incoming && incoming.length > 0) {
        const since = nowIso();
        const entryA = {
            friendId: target.id,
            friendUsername: target.username || "",
            since,
        };
        const entryB = {
            friendId: userId,
            friendUsername: ctx.username || "",
            since,
        };
        nk.storageWrite([
            { collection: COLLECTION_FRIENDS, key: entryA.friendId, userId, value: entryA },
            { collection: COLLECTION_FRIENDS, key: entryB.friendId, userId: target.id, value: entryB },
        ]);
        nk.storageDelete([
            { collection: COLLECTION_FRIEND_REQUESTS, key: target.id, userId },
        ]);
        return JSON.stringify({ status: "accepted" });
    }
    const outgoing = nk.storageRead([
        { collection: COLLECTION_FRIEND_REQUESTS, key: userId, userId: target.id },
    ]);
    if (outgoing && outgoing.length > 0) {
        return JSON.stringify({ status: "pending" });
    }
    const request = {
        fromUserId: userId,
        fromUsername: ctx.username || "",
        toUserId: target.id,
        createdAt: nowIso(),
    };
    nk.storageWrite([
        {
            collection: COLLECTION_FRIEND_REQUESTS,
            key: userId,
            userId: target.id,
            value: request,
        },
    ]);
    return JSON.stringify({ status: "pending" });
};
const rpcFriendAccept = (ctx, _logger, nk, payload) => {
    const userId = ensureUser(ctx);
    const data = parsePayload(payload);
    const fromUserId = (data.fromUserId || "").trim();
    if (!fromUserId) {
        throw new Error("fromUserId required");
    }
    const records = nk.storageRead([
        { collection: COLLECTION_FRIEND_REQUESTS, key: fromUserId, userId },
    ]);
    if (!records || records.length === 0) {
        throw new Error("request not found");
    }
    const request = records[0].value;
    const since = nowIso();
    const entryA = {
        friendId: fromUserId,
        friendUsername: request.fromUsername || "",
        since,
    };
    const entryB = {
        friendId: userId,
        friendUsername: ctx.username || "",
        since,
    };
    nk.storageWrite([
        { collection: COLLECTION_FRIENDS, key: entryA.friendId, userId, value: entryA },
        { collection: COLLECTION_FRIENDS, key: entryB.friendId, userId: fromUserId, value: entryB },
    ]);
    nk.storageDelete([
        { collection: COLLECTION_FRIEND_REQUESTS, key: fromUserId, userId },
    ]);
    return JSON.stringify({ status: "accepted" });
};
const rpcFriendDecline = (ctx, _logger, nk, payload) => {
    const userId = ensureUser(ctx);
    const data = parsePayload(payload);
    const fromUserId = (data.fromUserId || "").trim();
    if (!fromUserId) {
        throw new Error("fromUserId required");
    }
    nk.storageDelete([
        { collection: COLLECTION_FRIEND_REQUESTS, key: fromUserId, userId },
    ]);
    return JSON.stringify({ status: "declined" });
};
const rpcFriendsChatSend = (ctx, _logger, nk, payload) => {
    var _a, _b;
    const userId = ensureUser(ctx);
    const data = parsePayload(payload);
    const toUserId = (data.toUserId || "").trim();
    const text = (data.text || "").trim();
    if (!toUserId || !text) {
        throw new Error("toUserId and text required");
    }
    const friends = nk.storageRead([
        { collection: COLLECTION_FRIENDS, key: toUserId, userId },
    ]);
    if (!friends || friends.length === 0) {
        throw new Error("not friends");
    }
    const chatId = friendChatKey(userId, toUserId);
    const records = nk.storageRead([
        { collection: COLLECTION_FRIEND_CHAT, key: chatId, userId: SYSTEM_USER_ID },
    ]);
    const history = ((_b = (_a = records === null || records === void 0 ? void 0 : records[0]) === null || _a === void 0 ? void 0 : _a.value) === null || _b === void 0 ? void 0 : _b.messages) || [];
    const message = {
        fromUserId: userId,
        toUserId,
        text,
        timestamp: nowIso(),
    };
    history.push(message);
    const trimmed = history.slice(-100);
    nk.storageWrite([
        {
            collection: COLLECTION_FRIEND_CHAT,
            key: chatId,
            userId: SYSTEM_USER_ID,
            value: { messages: trimmed },
        },
    ]);
    return JSON.stringify({ message });
};
const rpcFriendsChatHistory = (ctx, _logger, nk, payload) => {
    var _a, _b;
    const userId = ensureUser(ctx);
    const data = parsePayload(payload);
    const withUserId = (data.withUserId || "").trim();
    if (!withUserId) {
        throw new Error("withUserId required");
    }
    const friends = nk.storageRead([
        { collection: COLLECTION_FRIENDS, key: withUserId, userId },
    ]);
    if (!friends || friends.length === 0) {
        throw new Error("not friends");
    }
    const chatId = friendChatKey(userId, withUserId);
    const records = nk.storageRead([
        { collection: COLLECTION_FRIEND_CHAT, key: chatId, userId: SYSTEM_USER_ID },
    ]);
    const history = ((_b = (_a = records === null || records === void 0 ? void 0 : records[0]) === null || _a === void 0 ? void 0 : _a.value) === null || _b === void 0 ? void 0 : _b.messages) || [];
    const limit = clamp(Number(data.limit || 50), 1, 100);
    return JSON.stringify({ messages: history.slice(-limit) });
};
const rpcGetMyCharacters = (ctx, _logger, nk, _payload) => {
    var _a, _b;
    const userId = ensureUser(ctx);
    const list = nk.storageList(userId, COLLECTION_CHARACTERS, 10);
    const characters = (_b = (_a = list === null || list === void 0 ? void 0 : list.objects) === null || _a === void 0 ? void 0 : _a.map((obj) => obj.value)) !== null && _b !== void 0 ? _b : [];
    return JSON.stringify({ characters });
};
const rpcSelectCharacter = (ctx, _logger, nk, payload) => {
    const userId = ensureUser(ctx);
    const data = parsePayload(payload);
    if (!data.characterId) {
        throw new Error("characterId required");
    }
    const records = nk.storageRead([
        { collection: COLLECTION_CHARACTERS, key: data.characterId, userId },
    ]);
    if (!records || records.length === 0) {
        throw new Error("character not found");
    }
    nk.storageWrite([
        {
            collection: COLLECTION_PROFILE,
            key: "selected_character",
            userId,
            value: { characterId: data.characterId },
        },
    ]);
    const character = records[0].value;
    return JSON.stringify({
        character,
        inventory: { items: [], spoils: [] },
        stats: character.stats,
        permissions: {},
    });
};
const rpcCreateRoom = (ctx, _logger, nk, payload) => {
    const userId = ensureUser(ctx);
    const data = parsePayload(payload);
    if (!data.mode) {
        throw new Error("mode required");
    }
    const roomId = nk.uuidv4();
    const now = nowIso();
    const room = {
        roomId,
        mode: data.mode,
        leaderId: userId,
        members: [userId],
        ready: [],
        status: "open",
        createdAt: now,
        updatedAt: now,
    };
    writeRoom(nk, room);
    return JSON.stringify({ roomId, leaderId: userId, rules: { mode: data.mode } });
};
const rpcJoinRoom = (ctx, _logger, nk, payload) => {
    const userId = ensureUser(ctx);
    const data = parsePayload(payload);
    if (!data.roomId) {
        throw new Error("roomId required");
    }
    const { room, version } = readRoom(nk, data.roomId);
    if (room.status !== "open") {
        throw new Error("room not open");
    }
    if (!room.members.includes(userId)) {
        const capacity = getRoomCapacity(room.mode);
        if (room.members.length >= capacity) {
            throw new Error("room full");
        }
        room.members.push(userId);
    }
    room.updatedAt = nowIso();
    writeRoom(nk, room, version);
    return JSON.stringify({ room, members: room.members, rules: { mode: room.mode } });
};
const rpcLeaveRoom = (ctx, _logger, nk, payload) => {
    const userId = ensureUser(ctx);
    const data = parsePayload(payload);
    if (!data.roomId) {
        throw new Error("roomId required");
    }
    const { room, version } = readRoom(nk, data.roomId);
    room.members = room.members.filter((id) => id !== userId);
    room.ready = room.ready.filter((id) => id !== userId);
    if (room.members.length === 0) {
        deleteRoom(nk, room.roomId);
        return JSON.stringify({ roomId: room.roomId, closed: true });
    }
    if (room.leaderId === userId) {
        room.leaderId = room.members[0];
    }
    room.updatedAt = nowIso();
    writeRoom(nk, room, version);
    return JSON.stringify({ roomId: room.roomId, leaderId: room.leaderId });
};
const rpcReady = (ctx, _logger, nk, payload) => {
    const userId = ensureUser(ctx);
    const data = parsePayload(payload);
    if (!data.roomId) {
        throw new Error("roomId required");
    }
    updateReadyCooldown(nk, userId, data.roomId);
    const { room, version } = readRoom(nk, data.roomId);
    if (!room.members.includes(userId)) {
        throw new Error("not in room");
    }
    if (!room.ready.includes(userId)) {
        room.ready.push(userId);
    }
    room.updatedAt = nowIso();
    writeRoom(nk, room, version);
    return JSON.stringify({ roomId: room.roomId, ready: room.ready });
};
const rpcUnready = (ctx, _logger, nk, payload) => {
    const userId = ensureUser(ctx);
    const data = parsePayload(payload);
    if (!data.roomId) {
        throw new Error("roomId required");
    }
    updateReadyCooldown(nk, userId, data.roomId);
    const { room, version } = readRoom(nk, data.roomId);
    room.ready = room.ready.filter((id) => id !== userId);
    room.updatedAt = nowIso();
    writeRoom(nk, room, version);
    return JSON.stringify({ roomId: room.roomId, ready: room.ready });
};
const rpcSetRoomBet = (ctx, _logger, nk, payload) => {
    var _a;
    const userId = ensureUser(ctx);
    const data = parsePayload(payload);
    if (!data.roomId || !data.type || !data.amountPerPlayer) {
        throw new Error("roomId, type, amountPerPlayer required");
    }
    if (data.amountPerPlayer <= 0) {
        throw new Error("amountPerPlayer must be > 0");
    }
    const { room, version } = readRoom(nk, data.roomId);
    if (room.leaderId !== userId) {
        throw new Error("only leader can set bet");
    }
    if (room.status !== "open") {
        throw new Error("room not open");
    }
    if (data.type === "spoil" && !data.itemId) {
        throw new Error("itemId required for spoil");
    }
    room.bet = {
        type: data.type,
        itemId: (_a = data.itemId) !== null && _a !== void 0 ? _a : null,
        amountPerPlayer: Math.floor(data.amountPerPlayer),
    };
    room.betStatus = "open";
    room.deposits = {};
    room.poolTotal = 0;
    room.updatedAt = nowIso();
    writeRoom(nk, room, version);
    return JSON.stringify({ roomId: room.roomId, bet: room.bet, betStatus: room.betStatus });
};
const rpcDepositBet = (ctx, _logger, nk, payload) => {
    var _a, _b, _c;
    const userId = ensureUser(ctx);
    const data = parsePayload(payload);
    if (!data.roomId) {
        throw new Error("roomId required");
    }
    const { room, version } = readRoom(nk, data.roomId);
    if (!room.bet || !room.betStatus || room.betStatus !== "open") {
        throw new Error("bet not open");
    }
    if (!room.members.includes(userId)) {
        throw new Error("not in room");
    }
    room.deposits = (_a = room.deposits) !== null && _a !== void 0 ? _a : {};
    if (room.deposits[userId]) {
        throw new Error("already deposited");
    }
    const wallet = readWallet(nk, userId);
    const amount = room.bet.amountPerPlayer;
    if (room.bet.type === "gold") {
        if (wallet.gold < amount) {
            throw new Error("insufficient gold");
        }
        wallet.gold -= amount;
    }
    else {
        const itemId = (_b = room.bet.itemId) !== null && _b !== void 0 ? _b : "";
        const current = (_c = wallet.spoils[itemId]) !== null && _c !== void 0 ? _c : 0;
        if (current < amount) {
            throw new Error("insufficient spoils");
        }
        wallet.spoils[itemId] = current - amount;
    }
    writeWallet(nk, userId, wallet);
    room.deposits[userId] = true;
    const depositedCount = Object.keys(room.deposits).length;
    room.poolTotal = depositedCount * amount;
    room.updatedAt = nowIso();
    writeRoom(nk, room, version);
    return JSON.stringify({ roomId: room.roomId, deposits: room.deposits, poolTotal: room.poolTotal });
};
const rpcStartRoomMatch = (ctx, _logger, nk, payload) => {
    var _a;
    const userId = ensureUser(ctx);
    const data = parsePayload(payload);
    if (!data.roomId) {
        throw new Error("roomId required");
    }
    const { room, version } = readRoom(nk, data.roomId);
    if (room.leaderId !== userId) {
        throw new Error("only leader can start");
    }
    if (room.status !== "open") {
        throw new Error("room not open");
    }
    if (room.ready.length !== room.members.length) {
        throw new Error("all members must be ready");
    }
    if (room.members.length !== getRoomCapacity(room.mode)) {
        throw new Error("room not full");
    }
    if (!room.bet || room.betStatus !== "open") {
        throw new Error("bet required");
    }
    const deposits = (_a = room.deposits) !== null && _a !== void 0 ? _a : {};
    if (Object.keys(deposits).length !== room.members.length) {
        throw new Error("all members must deposit");
    }
    if (room.mode === "pvp_1v1" && room.members.length === 2) {
        const [a, b] = room.members;
        const pair = readPairLosses(nk, a, b);
        if (pair.blockedUntil && pair.blockedUntil > Date.now()) {
            throw new Error("anti-trade block active");
        }
    }
    const matchId = nk.matchCreate("pvp_match", {
        roomId: room.roomId,
        mode: room.mode,
        members: room.members,
    });
    room.status = "in_match";
    room.matchId = matchId;
    room.betStatus = "locked";
    room.updatedAt = nowIso();
    writeRoom(nk, room, version);
    return JSON.stringify({ matchId });
};
const rpcMarketListItem = (_ctx, _logger, _nk, _payload) => {
    throw new Error("not implemented");
};
const rpcMarketCancel = (_ctx, _logger, _nk, _payload) => {
    throw new Error("not implemented");
};
const rpcMarketBuy = (_ctx, _logger, _nk, _payload) => {
    throw new Error("not implemented");
};
const rpcResetBuildWithGold = (_ctx, _logger, _nk, _payload) => {
    throw new Error("not implemented");
};
const rpcConvertSpoilsToGold = (_ctx, _logger, _nk, _payload) => {
    throw new Error("not implemented");
};
const rpcGuildCraft = (_ctx, _logger, _nk, _payload) => {
    throw new Error("not implemented");
};
const rpcGuildUpgrade = (_ctx, _logger, _nk, _payload) => {
    throw new Error("not implemented");
};
const beforeAuthenticateCustom = (ctx, _logger, nk, req) => {
    var _a, _b;
    const create = (_a = req.create) !== null && _a !== void 0 ? _a : false;
    var _c;
    const account = (_c = req.account) !== null && _c !== void 0 ? _c : {};
    const vars = (_b = req.vars) !== null && _b !== void 0 ? _b : (account.vars || {});
    _logger.info(`BeforeAuthCustom create=${req.create} id=${req.id} username=${req.username} accountId=${account.id}`);
    const candidates = [req.id, req.username, account.id].filter((value) => Boolean(value));
    const primary = (req.username || req.id || account.id || "").trim();
    if (!primary) {
        throw new Error("login required");
    }
    if (create) {
        const pending = readPending2FA(nk, primary);
        if (!pending || !pending.approved || pending.expiresAt < Date.now()) {
            throw new Error("registration not approved");
        }
        const token = String(vars["register_token"] || "");
        if (!pending.approveToken || !pending.approveTokenExpiresAt) {
            throw new Error("registration token required");
        }
        if (pending.approveTokenExpiresAt < Date.now()) {
            throw new Error("registration token expired");
        }
        if (token !== pending.approveToken) {
            throw new Error("registration token invalid");
        }
        return req;
    }
    let mapping = null;
    for (const login of candidates) {
        mapping = readLoginMapping(nk, login);
        if (mapping && mapping.userId) {
            break;
        }
    }
    if (!mapping || !mapping.userId) {
        for (const login of candidates) {
            const userId = findUserIdByUsername(nk, login);
            if (userId) {
                mapping = { login, userId };
                saveLoginMapping(nk, login, userId);
                break;
            }
        }
    }
    if (!mapping || !mapping.userId) {
        throw new Error("login not found");
    }
    const loginKey = mapping.login || primary;
    const stored = readUserSecret(nk, mapping.userId);
    if (!stored) {
        const pending = readPending2FA(nk, loginKey);
        const code = vars["totp"];
        if (pending && pending.approved && pending.expiresAt > Date.now() && code) {
            if (verifyTotp(pending.secret, String(code))) {
                saveUserSecret(nk, mapping.userId, loginKey, pending.secret);
                saveLoginMapping(nk, loginKey, mapping.userId);
                deletePending2FA(nk, loginKey);
                return req;
            }
        }
        throw new Error("2fa not configured");
    }
    const code = vars["totp"];
    if (!code || !verifyTotp(stored.secret, String(code))) {
        throw new Error("invalid 2fa");
    }
    return req;
};
const afterAuthenticateCustom = (ctx, _logger, nk, req) => {
    var _a;
    const create = (_a = req.create) !== null && _a !== void 0 ? _a : false;
    _logger.info(`AfterAuthCustom create=${create} id=${req.id} username=${req.username} accountId=${(_a = req.account) === null || _a === void 0 ? void 0 : _a.id} userId=${ctx.userId}`);
    const account = req.account || {};
    const login = (req.username || req.id || account.id || ctx.username || "").trim();
    let userId = ctx.userId;
    if (!userId && login) {
        userId = findUserIdByUsername(nk, login);
    }
    if (!login) {
        return;
    }
    if (!userId) {
        throw new Error("user not found");
    }
    const pending = readPending2FA(nk, login);
    if (!pending || !pending.approved) {
        return;
    }
    if (!create && pending.expiresAt < Date.now()) {
        return;
    }
    saveUserSecret(nk, userId, login, pending.secret);
    saveLoginMapping(nk, login, userId);
    deletePending2FA(nk, login);
};
// Match handlers
const pveMatch = {
    matchInit: (_ctx, _logger, _nk, _params) => ({ state: {}, tickRate: 30, label: "pve" }),
    matchJoinAttempt: (_ctx, _logger, _nk, _dispatcher, _tick, _state, _presence, _metadata) => ({ state: _state, accept: true }),
    matchJoin: (_ctx, _logger, _nk, _dispatcher, _tick, _state, _presences) => _state,
    matchLeave: (_ctx, _logger, _nk, _dispatcher, _tick, _state, _presences) => _state,
    matchLoop: (_ctx, _logger, _nk, _dispatcher, _tick, _state, _messages) => _state,
    matchTerminate: (_ctx, _logger, _nk, _dispatcher, _tick, _state, _graceSeconds) => _state,
    matchSignal: (_ctx, _logger, _nk, _dispatcher, _tick, _state, _data) => ({ state: _state, data: "" }),
};
const pvpMatch = {
    matchInit: (ctx, _logger, _nk, params) => {
        const typedParams = params;
        const players = {};
        for (const userId of typedParams.members) {
            players[userId] = {
                userId,
                hp: 100,
                mp: 50,
                pos: { x: 0, y: 0 },
                damageDealt: 0,
                left: false,
            };
        }
        const state = {
            matchId: ctx.matchId,
            roomId: typedParams.roomId,
            mode: typedParams.mode,
            startedAt: nowIso(),
            players,
            maxTicks: 30 * 180,
            ended: false,
        };
        return { state, tickRate: 30, label: "pvp" };
    },
    matchJoinAttempt: (_ctx, _logger, _nk, _dispatcher, _tick, state, presence, _metadata) => {
        const typed = state;
        const accept = Boolean(typed.players[presence.userId]);
        return { state, accept };
    },
    matchJoin: (_ctx, _logger, _nk, _dispatcher, _tick, state, presences) => {
        const typed = state;
        for (const presence of presences) {
            const player = typed.players[presence.userId];
            if (player) {
                player.presence = presence;
            }
        }
        return state;
    },
    matchLeave: (_ctx, _logger, _nk, _dispatcher, _tick, state, presences) => {
        const typed = state;
        for (const presence of presences) {
            const player = typed.players[presence.userId];
            if (player) {
                player.left = true;
            }
        }
        return state;
    },
    matchLoop: (_ctx, logger, nk, dispatcher, tick, state, messages) => {
        var _a;
        const typed = state;
        if (typed.ended) {
            return state;
        }
        const events = [];
        for (const message of messages) {
            if (message.opCode !== 1) {
                continue;
            }
            const player = typed.players[message.sender.userId];
            if (!player) {
                continue;
            }
            try {
                const data = JSON.parse(message.data);
                if (data.move) {
                    player.pos.x = clamp(data.move.x, -20, 20);
                    player.pos.y = clamp(data.move.y, -20, 20);
                }
                if (data.cast) {
                    const targetId = data.cast.targetId;
                    const target = targetId ? typed.players[targetId] : findOpponent(typed.players, player.userId);
                    if (target && target.hp > 0) {
                        const damage = 10;
                        target.hp = Math.max(0, target.hp - damage);
                        player.damageDealt += damage;
                        events.push({ type: "damage", payload: { from: player.userId, to: target.userId, amount: damage } });
                    }
                }
            }
            catch (error) {
                logger.warn("invalid input: %s", error.message);
            }
        }
        for (const player of Object.values(typed.players)) {
            if (player.left) {
                typed.ended = true;
                typed.endReason = "forfeit";
                typed.winnerId = (_a = findOpponent(typed.players, player.userId)) === null || _a === void 0 ? void 0 : _a.userId;
                break;
            }
        }
        const deadPlayers = Object.values(typed.players).filter((player) => player.hp <= 0);
        if (deadPlayers.length > 0) {
            typed.ended = true;
            typed.endReason = "knockout";
            const alive = Object.values(typed.players).find((player) => player.hp > 0);
            typed.winnerId = alive === null || alive === void 0 ? void 0 : alive.userId;
        }
        if (!typed.ended && tick >= typed.maxTicks) {
            typed.ended = true;
            typed.endReason = "timeout";
            typed.winnerId = resolveWinnerByDamage(typed.players);
        }
        if (tick % 2 === 0) {
            const snapshot = buildSnapshot(tick, typed.players, events);
            dispatcher.broadcastMessage(SNAPSHOT_OP, JSON.stringify(snapshot));
        }
        else if (events.length > 0) {
            dispatcher.broadcastMessage(EVENT_OP, JSON.stringify({ tick, events }));
        }
        if (typed.ended) {
            const antiTrade = resolveAntiTrade(nk, typed);
            const summary = buildMatchSummary(nk, typed, antiTrade);
            dispatcher.broadcastMessage(RESULT_OP, JSON.stringify(summary));
            persistMatchSummary(nk, summary);
            if (summary.payout) {
                applyPayout(nk, summary.payout);
            }
            updateRoomAfterMatch(nk, typed.roomId, typed.matchId, summary);
            dispatcher.matchTerminate(5);
        }
        return state;
    },
    matchTerminate: (_ctx, _logger, _nk, _dispatcher, _tick, state, _graceSeconds) => state,
    matchSignal: (_ctx, _logger, _nk, _dispatcher, _tick, state, _data) => ({ state, data: "" }),
};
const hybridMatch = pveMatch;
const rankedMatch = pveMatch;
function findOpponent(players, userId) {
    return Object.values(players).find((player) => player.userId !== userId);
}
function resolveWinnerByDamage(players) {
    const sorted = Object.values(players).sort((a, b) => b.damageDealt - a.damageDealt);
    if (sorted.length === 0) {
        return undefined;
    }
    if (sorted.length === 1) {
        return sorted[0].userId;
    }
    if (sorted[0].damageDealt === sorted[1].damageDealt) {
        return undefined;
    }
    return sorted[0].userId;
}
function buildSnapshot(tick, players, events) {
    const view = {};
    for (const player of Object.values(players)) {
        view[player.userId] = { x: player.pos.x, y: player.pos.y, hp: player.hp, mp: player.mp };
    }
    return { tick, players: view, events };
}
function buildBaseMatchSummary(state) {
    var _a;
    const damageTotals = {};
    for (const player of Object.values(state.players)) {
        damageTotals[player.userId] = player.damageDealt;
    }
    return {
        matchId: state.matchId,
        mode: state.mode,
        roomId: state.roomId,
        startedAt: state.startedAt,
        endedAt: nowIso(),
        winnerId: state.winnerId,
        reason: (_a = state.endReason) !== null && _a !== void 0 ? _a : "unknown",
        damageTotals,
        members: Object.keys(state.players),
    };
}
function persistMatchSummary(nk, summary) {
    nk.storageWrite([
        {
            collection: COLLECTION_MATCH_LOGS,
            key: summary.matchId,
            userId: SYSTEM_USER_ID,
            value: summary,
        },
    ]);
}
function updateRoomAfterMatch(nk, roomId, matchId, summary) {
    try {
        const { room, version } = readRoom(nk, roomId);
        if (room.matchId === matchId) {
            room.status = "closed";
            if (room.betStatus === "locked") {
                room.betStatus = "paid";
            }
            room.updatedAt = nowIso();
            writeRoom(nk, room, version);
        }
    }
    catch (_error) {
        // Room might already be deleted; ignore.
    }
}
function buildMatchSummary(nk, state, antiTrade) {
    var _a;
    const base = buildBaseMatchSummary(state);
    const { room } = readRoom(nk, state.roomId);
    base.bet = room.bet;
    if (room.bet && state.winnerId) {
        const total = room.bet.amountPerPlayer * Object.keys(state.players).length;
        base.payout = {
            winnerId: state.winnerId,
            amount: total,
            type: room.bet.type,
            itemId: (_a = room.bet.itemId) !== null && _a !== void 0 ? _a : null,
        };
    }
    base.antiTrade = antiTrade;
    return base;
}
function applyPayout(nk, payout) {
    var _a, _b;
    if (!payout) {
        return;
    }
    const wallet = readWallet(nk, payout.winnerId);
    if (payout.type === "gold") {
        wallet.gold += payout.amount;
    }
    else {
        const itemId = (_a = payout.itemId) !== null && _a !== void 0 ? _a : "";
        wallet.spoils[itemId] = ((_b = wallet.spoils[itemId]) !== null && _b !== void 0 ? _b : 0) + payout.amount;
    }
    writeWallet(nk, payout.winnerId, wallet);
}
function resolveAntiTrade(nk, state) {
    var _a;
    if (state.mode !== "pvp_1v1" || !state.winnerId) {
        return undefined;
    }
    const loserId = Object.keys(state.players).find((id) => id !== state.winnerId);
    if (!loserId) {
        return undefined;
    }
    const pair = readPairLosses(nk, state.winnerId, loserId);
    const current = (_a = pair.losses[loserId]) !== null && _a !== void 0 ? _a : 0;
    const next = current + 1;
    const updated = {
        losses: { ...pair.losses, [loserId]: next },
    };
    if (next >= 2) {
        updated.blockedUntil = Date.now() + 24 * 60 * 60 * 1000;
    }
    else if (pair.blockedUntil && pair.blockedUntil > Date.now()) {
        updated.blockedUntil = pair.blockedUntil;
    }
    writePairLosses(nk, state.winnerId, loserId, updated);
    if (updated.blockedUntil && updated.blockedUntil > Date.now()) {
        return { blocked: true, blockedUntil: updated.blockedUntil };
    }
    return { blocked: false };
}
