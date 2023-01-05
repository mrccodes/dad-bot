require('dotenv').config(); //initialize dotenv
const {Client, GatewayIntentBits} = require('discord.js'); //import discord.js
require('@tensorflow/tfjs-node');
const {responses} = require('./responses')
const toxicity = require('@tensorflow-models/toxicity');

const threshold = 0.7;

const mute_threshold = 5;
const kick_threshold = 8;

let naughty_list = {};
let muted_list = {};

//create new client
const client = new Client({ intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,

] });


client.on('messageCreate', (m) => {
    if (m.author.bot) return false; 

    //if user is muted then we oughta delete their message right away ey? 
    if (muted_list[m.author.id]) {
        m.delete();
        return false;
    }

    checkMessageForToxicity(m.content)
        .then(results => evaluateResults(results))
        .then(categories => checkTheNaughtyList(categories.length, m.author))
        .then(userData => getResponse(userData))
        .then(response => {
            console.log('response to send', response)
            if (!response) return null
            let [message, action] = response;
            action(m.author);
            m.reply(message)
        })
    
})

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

/**
 * 
 * @param {array} results predictions returned from tensorflow toxicity
 * @returns {array}  each of the categories that were flagged as toxic
 */
const evaluateResults = (results) => results.map(result => (result.results[0].match === true ? result.label : null)).filter(n => n != null)


/**
 * 
 * @param {number} userData a number indicating how much of a pain in the ass a user has been, the higher the more asshole
 * @returns {string} an approproate response
 */
const getResponse = (userData) => {
    if (!userData || userData.score === 0) return null
    let nuisanceScore = userData.score;
    if (nuisanceScore > 0 && nuisanceScore < 2) return [responses[1][_getRandomInt(responses[1].length)], () => {}]
    if (nuisanceScore > 2 && nuisanceScore < mute_threshold) return [responses[2][_getRandomInt(responses[2].length)], () => {}]
    if (nuisanceScore > mute_threshold && nuisanceScore <  kick_threshold) return [responses[3][_getRandomInt(responses[3].length)], muteUser]
    if (nuisanceScore > kick_threshold) return [responses[4][_getRandomInt(responses[4].length)], kickUser]
}

/**
 * 
 * @param {number} severity - severety of the toxicity obvserved
 * @param {string} userId - user object
 * @returns 
 */
const checkTheNaughtyList = (severity, userId) => {
    console.log('naughty list', naughty_list)
    if (severity === 0) return null;
    if (naughty_list[userId]) {
        naughty_list[userId].score += severity;
    } else {
        naughty_list[userId] = {score: 1, action: null};
    }

    return naughty_list[userId];
}

//kicks a user
const kickUser = (user) => {
    user.kick({
        reason: "Toxicity"
    })
    console.log('kicked user', user.id)
}

//mutes a user
const muteUser = (user) => {
    muted_list[user.id] = 1;
    setTimeout(() => {
        console.log('callback called')
        console.log(muted_list, user.id)
        if (muted_list[user.id]) {
            delete muted_list[user.id]
            console.log('unmuted user', user.id)
        }
    }, 3600000)
    console.log('muted user', user.id)
}






const checkMessageForToxicity = async (message) => {
    return toxicity.load(threshold).then(async (model) => {
        return model.classify(message).then(predictions => {
          return predictions
        });
      });
}

//every 24h minutes remove 1 nuisance point from each user to give them a fighting chance to not get kicked
const timeDecay = setInterval(() => {
    Object.keys(naughty_list).forEach(k => {
        if (naughty_list[k].score && naughty_list[k].score > 0) {
            naughty_list[k].score--
        } else if (naughty_list[k].score === 0) {
            delete naughty_list[k]
        } 
    })
    console.log('user nuisance scores reduced', naughty_list)
}, 86400000)

const _getRandomInt = ( max) => {
    return Math.floor(Math.random() * max);
  }
  

//make sure this line is the last line
client.login(process.env.CLIENT_TOKEN); //login bot using token