# Dad Bot

A discord bot whom gets feisty when users are being rude.

## Description

Discord bot build with Node that uses a Tensorflow Toxicity model to determin the toxicity of message and responds accordingly. 

## Getting Started

### Dependencies

* Node v19.*
* `flyctl` (if hosting with included host file) [Fly.io](https://fly.io/)
* Fly.io account
* Discord account 

### Installing

* Clone this repo to your machine
* Create a new bot in the discord developer panel 


### Executing program

#### Run bot locally
* add a `.env` file to the root directory with your discord bot token:
``` 
CLIENT_TOKEN=<DISCORD_BOT_TOKEN>
```
* start the bot!
```
npm install
npm start
```


#### Host bot on Fly.io

* Create Fly.io and install `flyctl` command
* from the project directory run:
```
flyctl launch -e CLIENT_TOKEN=<DISCORD_BOT_TOKEN>
```
* answer the prompts
    * yes to copying configuration from included `fly.toml`
    * No to databse prompts
    * Yes to deploy immediately prompt

