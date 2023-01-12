require('dotenv').config(); 
require('@tensorflow/tfjs-node');
const {Client, GatewayIntentBits, Collection, Events} = require('discord.js');
const {responses} = require('./responses')
const toxicity = require('@tensorflow-models/toxicity');
const fs = require('node:fs');
const path = require('node:path');
const {muted_list, naughty_list} = require('./data');
const { muteUser } = require('./utils');


//number representing the threshold at which we consider a tensoflow estimate "toxic". a lower value will be a stricter bot (allegedly). 
// 0.7 seems to work best when profanity filter is off, to avoid flagging profanity as insults also. 
const threshold = 0.7;

//integer representing the nuisance score at which to start threatening a user with a mute
const threat_threshold = 2;

//integer representing the nuisance score at which to mute a user, must be greater than threat_threshold
const mute_threshold = 5;

//integer representing the nuisance score at which to kick a user, must be greater than mute_threshold
const kick_threshold = 8;

//check for profanity
const profanity_filter = false;

//milliseconds representing the interval between each time we remove a nuicance point from a user as a way to give users a chance to correct bad behavior, default 24h
const time_decay_interval = 86400000;




//create new client
const client = new Client({ intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,

] });

client.commands = new Collection();

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const filePath = path.join(commandsPath, file);
	const command = require(filePath);

	// Set a new item in the Collection with the key as the command name and the value as the exported module
	if ('data' in command && 'execute' in command) {
		client.commands.set(command.data.name, command);
	} else {
		console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
	}
}

client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

    const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		console.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		await command.execute(interaction);
	} catch (error) {
		console.error(error);
		await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
	}
});


client.on('messageCreate', (m) => {
    if (m.author.bot) return false; //infinite loops are bad, bots are good
    let r = { messageContent: m.content } //result object for logging purposes

    const guildId = m.guild.id;
    const userId = m.author.id;
    //delete message if user is muted in guild
    if (muted_list[guildId] && muted_list[guildId][userId]) {
        m.delete();
        return false;
    }

    checkMessageForToxicity(m.content) 
        .then(results => evaluateResults(results)) //strip results down to array of flagged categories
        .then(categories => {
            r.toxicityResults = categories;
            //check user behavior record and update it 
            return checkTheNaughtyList(categories.length, userId, guildId)
        })
        .then(userNuisanceScore => {
            //get an appropriate response and action to take, if any
            r.userNuisanceScore = userNuisanceScore;
            return getResponse(userNuisanceScore)
        })
        .then(response => {
            if (!response) {
                r.action = null;
                console.log(r);
                return null
            }
            let [message, action] = response;
            let actionResult = action(m.guild.id ,m.author.id ,m);
            m.reply(message)
            r.action = actionResult ?? null;
            console.log(r);
        })
        .catch(err => console.error("error checking message toxicity", err))
    
})

client.on('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
});

/**
 * Evaluates all the predictions and simply gives back a list of all the triggered categories. 
 * @param {array} results predictions returned from tensorflow toxicity
 * @returns {array}  each of the categories that were flagged as toxic
 */
const evaluateResults = (results) => {
    let toxic_tags = results.map(result => (result.results[0].match === true ? result.label : null)).filter(n => n != null);

    //if the profanity filter is enabled, we'll strip obscene from the results, and if toxicity was the only other thing, well remove that too.
    let filtered_tags = profanity_filter ? toxic_tags : toxic_tags.filter(t => t !== 'obscene');
    if (!profanity_filter && filtered_tags.length === 1 && filtered_tags.includes('toxicity')) return []
    return filtered_tags;
}


/**
 * Generates an appropriate response to send back to the user and an action to take on them if theyve been real naughty
 * @param {object} nuisanceScore a number representing how much of a pain in the ass our user has been. 
 * @returns { array } an array containing approproate response and an action to take
 */
const getResponse = (nuisanceScore) => {
    if (!nuisanceScore || nuisanceScore === 0) return null

    if (nuisanceScore > 0 && nuisanceScore < threat_threshold) return [responses[1][_getRandomInt(responses[1].length)], () => {}]
    if (nuisanceScore >= threat_threshold && nuisanceScore < mute_threshold) return [responses[2][_getRandomInt(responses[2].length)], () => {}]
    if (nuisanceScore >= mute_threshold && nuisanceScore <  kick_threshold) return [responses[3][_getRandomInt(responses[3].length)], muteUser]
    if (nuisanceScore >= kick_threshold) return [responses[4][_getRandomInt(responses[4].length)], kickUser]
}

/**
 * Adds our naughty user to the naughty list and/or updates their nuisance score.
 * @param { number } severity - severety of the toxicity obvserved. Based off the number of different categories in which the message was deemed toxic
 * @param { string } userId - user id
 * @param { string } guildId - the guild in which the message was sent
 * @returns { number } user nuisance score
 */
const checkTheNaughtyList = (severity, userId, guildId) => {
    if (!naughty_list[guildId]) {
        naughty_list[guildId] = {};
    }

    if (severity === 0) return null;
    if (naughty_list[guildId][userId]) {
        naughty_list[guildId][userId] += severity;
    } else {
        naughty_list[guildId][userId] = severity;
    }

    return naughty_list[guildId][userId];
}

/**
 * Kicks a user and deleted them from our lists.
 * @param {object} message - discord message object
 */
const kickUser = (_, __, message) => {
    let uid = message.author.id
    message.member && message.member.kick({ reason: "Toxicity" })
    .then((_) => {
        console.log('kicked user', uid)
        if (naughty_list[uid]) {
            delete naughty_list[uid]
        }
        if (muted_list[message.guild.id][uid]) {
            delete muted_list[message.guild.id][uid]
        }
    })
    return `Kick user ${uid}`
}




/**
 * Uses tensorflow toxicity model to determine toxicty of text
 * @param {object} message - discord message object 
 * @returns {predictions[]} discord predictions array
 */
const checkMessageForToxicity = async (message) => {
    return toxicity.load(threshold).then(async (model) => {
        return model.classify(message).then(predictions => {
          return predictions
        });
      });
}

/**
 * remove 1 nuisance point from each user to give them a fighting chance to not get kicked on a set interval
 */
const _timeDecay = setInterval(() => {
    Object.keys(naughty_list).forEach(k => {
        if (naughty_list[k].score && naughty_list[k].score > 0) {
            naughty_list[k].score--
        } else if (naughty_list[k].score === 0) {
            delete naughty_list[k]
        } 
    })
    console.log('user nuisance scores reduced', naughty_list)
}, time_decay_interval)

const _getRandomInt = ( max) => {
    return Math.floor(Math.random() * max);
  }
  


client.login(process.env.CLIENT_TOKEN); //login bot using token


module.exports = {
    muted_list,
    naughty_list
}