const Discord = require('discord.js');
const axios = require('axios');


const token = 'YOUR_BOT_TOKEN';
const triageApiKey = 'YOUR_TRIAGE_API_KEY';
const timeoutDuration = 5 * 24 * 60 * 60 * 1000; 
const approvalChannelId = 'CHANNEL_ID_FOR_MANUAL_APPROVAL'; 


const client = new Discord.Client({
  intents: [
    Discord.GatewayIntentBits.Guilds,
    Discord.GatewayIntentBits.GuildMessages,
    Discord.GatewayIntentBits.MessageContent,
  ],
});


let mode = 'manual';


async function scanFile(file) {
  const url = 'https://tria.ge/api/v0/submit';
  const headers = {
    'Authorization': `Bearer ${triageApiKey}`,
    'Content-Type': 'application/json',
  };
  const data = {
    'file': file,
  };
  const response = await axios.post(url, data, { headers });
  const analysisId = response.data.analysis_id;
  return analysisId;
}


async function getAnalysisResults(analysisId) {
  const url = `https://tria.ge/api/v0/analysis/${analysisId}`;
  const headers = {
    'Authorization': `Bearer ${triageApiKey}`,
  };
  const response = await axios.get(url, { headers });
  const results = response.data;
  return results;
}


async function timeoutUser(user) {
  const guild = client.guilds.cache.get(user.guild.id);
  const member = guild.members.cache.get(user.id);
  await member.timeout(timeoutDuration, 'Malicious file detected');
}


client.on('messageCreate', async (message) => {

  if (message.content.startsWith('/')) {
    const command = message.content.split(' ')[0];
    switch (command) {
      case '/manual':
        mode = 'manual';
        message.channel.send('Switched to manual mode');
        break;
      case '/auto':
        mode = 'auto';
        message.channel.send('Switched to auto mode');
        break;
      default:
        break;
    }
  }


  if (message.attachments.size > 0) {
    const attachment = message.attachments.first();
    const file = attachment.url;


    if (mode === 'auto') {
 
      const analysisId = await scanFile(file);
      const results = await getAnalysisResults(analysisId);
      if (results.verdict === 'malicious') {
        
        await timeoutUser(message.author);
        const approvalChannel = client.channels.cache.get(approvalChannelId);
        approvalChannel.send(`User ${message.author.username} needs manual approval`);
      }
    } else if (mode === 'manual') {
      
      if (message.mentions.has(client.user)) {
      
        const analysisId = await scanFile(file);
        const results = await getAnalysisResults(analysisId);
        if (results.verdict === 'malicious') {
          
          await timeoutUser(message.author);
          const approvalChannel = client.channels.cache.get(approvalChannelId);
          approvalChannel.send(`User ${message.author.username} needs manual approval`);
        }
      }
    }
  }
});


client.login(token);