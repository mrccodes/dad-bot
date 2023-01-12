var { muted_list } = require('./data')
const dayjs = require('dayjs')

/**
 * adds a user to the mute list, and unmutes them after 10 minutes
 * @param {string} guildId - guild id where user should be muted
 * @param {string} userId - user id to mute
 */
const muteUser = (guildId, uid, _) => {

    if (!muted_list[guildId]) {
        muted_list[guildId] = {};
    }

    //add user to object with value of unmute date
    muted_list[guildId][uid] = dayjs(new Date()).toString();
    setTimeout(() => {
        if (muted_list[guildId][uid] && dayjs(new Date()).diff(muted_list[guildId][uid], 'minute') >= 10) {
            delete muted_list[guildId][uid]
            console.log('unmuted user', uid)
        }
    }, 600010)
    console.log('muted user', uid, 'guild', guildId)
    return `Mute user ${uid} in guild ${guildId}`
}

/**
 * 
 * @param {string} guildId 
 * @param {string} userId 
 * @returns boolean - true if successful false if not
 */

const unmuteUser = (guildId, userId) => {
    if (muted_list[guildId] && muted_list[guildId][userId]) {
        delete muted_list[guildId][userId]
        console.log(`Unmuted user ${userId} successfully.`)
        return true
    }
    return false
}

module.exports = {
    muteUser,
    unmuteUser
}