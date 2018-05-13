﻿console.log("[App] Başlatılıyor...");
const Discord = require('discord.js');
const client = new Discord.Client();
const bot = new Discord.Client({fetchAllMembers:true});
const economy = require('discord-eco');
const ayarlar = require('./ayarlar.json');
const ownerID = '331846231514939392'
const chalk = require('chalk');
const botconfig = require("./botconfig");
const ytdl = require("ytdl-core");
const request = require("superagent")
const getYoutubeID = require("get-youtube-id");
const fetchVideoInfo = require("youtube-info");
const mysql = require("mysql");
const weather = require('weather-js');
const YoutubeDL = require('youtube-dl');
const async = require("async-mysql");
const embed = new Discord.RichEmbed();
const ffmpeg = require("ffmpeg");
const yt = require('ytdl-core');
const tokens = require('./tokens.json');
const modRole = 'asistanadmin';
const fs = require('fs');
const snekfetch = require('snekfetch');
const inspect = require('util');
const moment = require('moment');
const items = JSON.parse(fs.readFileSync('items.json', 'utf8'));
require('./util/eventLoader')(client);
let xp = require("./xp.json");
let purple = botconfig.purple;
const userData = JSON.parse(fs.readFileSync('Storage/userData.json', "utf8"));

var prefix = ayarlar.prefix;

/////////////////////////
let queue = {};

const commands = {
	'play': (msg) => {
		if (queue[msg.guild.id] === undefined) return msg.channel.send(`${tokens.prefix}add <url> ile biraz müzik ekle.`);
		if (!msg.guild.voiceConnection) return commands.join(msg).then(() => commands.play(msg));
		if (queue[msg.guild.id].playing) return msg.channel.send('Zaten bir müzik çalıyor.');
		let dispatcher;
		queue[msg.guild.id].playing = true;

		console.log(queue);
		(function play(song) {
			console.log(song);
			if (song === undefined) return msg.channel.send('Sıra boş').then(() => {
				queue[msg.guild.id].playing = false;
				msg.member.voiceChannel.leave();
			});
			msg.channel.send(`Çalınan: **${song.title}** Talep eden: **${song.requester}**`);
			dispatcher = msg.guild.voiceConnection.playStream(yt(song.url, { audioonly: true }), { passes : tokens.passes });
			let collector = msg.channel.createCollector(m => m);
			collector.on('message', m => {
				if (m.content.startsWith(tokens.prefix + 'pause')) {
					msg.channel.send('durduruldu').then(() => {dispatcher.pause();});
				} else if (m.content.startsWith(tokens.prefix + 'resume')){
					msg.channel.send('devam ediyor').then(() => {dispatcher.resume();});
				} else if (m.content.startsWith(tokens.prefix + 'skip')){
					msg.channel.send('geçildi').then(() => {dispatcher.end();});
				} else if (m.content.startsWith('volume+')){
					if (Math.round(dispatcher.volume*50) >= 100) return msg.channel.send(`Ses şiddeti: ${Math.round(dispatcher.volume*50)}%`);
					dispatcher.setVolume(Math.min((dispatcher.volume*50 + (2*(m.content.split('+').length-1)))/50,2));
					msg.channel.send(`Ses şiddeti: ${Math.round(dispatcher.volume*50)}%`);
				} else if (m.content.startsWith('volume-')){
					if (Math.round(dispatcher.volume*50) <= 0) return msg.channel.send(`Ses şiddeti: ${Math.round(dispatcher.volume*50)}%`);
					dispatcher.setVolume(Math.max((dispatcher.volume*50 - (2*(m.content.split('-').length-1)))/50,0));
					msg.channel.send(`Ses Şiddeti: ${Math.round(dispatcher.volume*50)}%`);
				} else if (m.content.startsWith(tokens.prefix + 'time')){
					msg.channel.send(`Süre: ${Math.floor(dispatcher.time / 60000)}:${Math.floor((dispatcher.time % 60000)/1000) <10 ? '0'+Math.floor((dispatcher.time % 60000)/1000) : Math.floor((dispatcher.time % 60000)/1000)}`);
				}
			});
			dispatcher.on('end', () => {
				collector.stop();
				play(queue[msg.guild.id].songs.shift());
			});
			dispatcher.on('error', (err) => {
				return msg.channel.send('Hata: ' + err).then(() => {
					collector.stop();
					play(queue[msg.guild.id].songs.shift());
				});
			});
		})(queue[msg.guild.id].songs.shift());
	},
	'join': (msg) => {
		return new Promise((resolve, reject) => {
			const voiceChannel = msg.member.voiceChannel;
			if (!voiceChannel || voiceChannel.type !== 'voice') return msg.reply('Sesli bir kanala katıl.');
			voiceChannel.join().then(connection => resolve(connection)).catch(err => reject(err));
		});
	},
	'add': (msg) => {
		let url = msg.content.split(' ')[1];
		if (url == '' || url === undefined) return msg.channel.send(`Bir YouTube linki eklemek için ${tokens.prefix}add yazınız`);
		yt.getInfo(url, (err, info) => {
			if(err) return msg.channel.send('Geçersiz YouTube Bağlantısı: ' + err);
			if (!queue.hasOwnProperty(msg.guild.id)) queue[msg.guild.id] = {}, queue[msg.guild.id].playing = false, queue[msg.guild.id].songs = [];
			queue[msg.guild.id].songs.push({url: url, title: info.title, requester: msg.author.username});
			msg.channel.send(`**${info.title}** sıraya eklendi`);
		});
	},
	'queue': (msg) => {
		if (queue[msg.guild.id] === undefined) return msg.channel.send(`${tokens.prefix}add <url> ile biraz müzik ekle`);
		let tosend = [];
		queue[msg.guild.id].songs.forEach((song, i) => { tosend.push(`${i+1}. ${song.title} - Talep eden: ${song.requester}`);});
		msg.channel.send(`__**${msg.guild.name}'s Müzik Kuyruğu:**__ Şu anda **${tosend.length}** şarkı sırada ${(tosend.length > 15 ? '*[Sadece 15 tanesi gösteriliyor]*' : '')}\n\`\`\`${tosend.slice(0,15).join('\n')}\`\`\``);
	}
};

client.on('message', msg => {
	if (!msg.content.startsWith(tokens.prefix)) return;
	if (commands.hasOwnProperty(msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0])) commands[msg.content.toLowerCase().slice(tokens.prefix.length).split(' ')[0]](msg);
});
///////////////////


const log = message => {
  console.log(`[${moment().format('YYYY-MM-DD HH:mm:ss')}] ${message}`);
};

client.commands = new Discord.Collection();
client.aliases = new Discord.Collection();
fs.readdir('./komutlar/', (err, files) => {
  if (err) console.error(err);
  log(`${files.length} komut yüklenecek.`);
  files.forEach(f => {
    let props = require(`./komutlar/${f}`);
    log(`Yüklenen komut: ${props.help.name}.`);
    client.commands.set(props.help.name, props);
    props.conf.aliases.forEach(alias => {
      client.aliases.set(alias, props.help.name);
    });
  });
});

client.reload = command => {
  return new Promise((resolve, reject) => {
    try {
      delete require.cache[require.resolve(`./komutlar/${command}`)];
      let cmd = require(`./komutlar/${command}`);
      client.commands.delete(command);
      client.aliases.forEach((cmd, alias) => {
        if (cmd === command) client.aliases.delete(alias);
      });
      client.commands.set(command, cmd);
      cmd.conf.aliases.forEach(alias => {
        client.aliases.set(alias, cmd.help.name);
      });
      resolve();
    } catch (e){
      reject(e);
    }
  });
};

client.load = command => {
  return new Promise((resolve, reject) => {
    try {
      let cmd = require(`./komutlar/${command}`);
      client.commands.set(command, cmd);
      cmd.conf.aliases.forEach(alias => {
        client.aliases.set(alias, cmd.help.name);
      });
      resolve();
    } catch (e){
      reject(e);
    }
  });
};

client.unload = command => {
  return new Promise((resolve, reject) => {
    try {
      delete require.cache[require.resolve(`./komutlar/${command}`)];
      let cmd = require(`./komutlar/${command}`);
      client.commands.delete(command);
      client.aliases.forEach((cmd, alias) => {
        if (cmd === command) client.aliases.delete(alias);
      });
      resolve();
    } catch (e){
      reject(e);
    }
  });
};




client.on('message', message => {


	if (message.author.id === client.user.id) return;
	  console.log(`LOG: S: ${message.guild.name} M: ${message.content} Y: ${message.author.tag}`);

  let xpAdd = Math.floor(Math.random() * 7) + 8;
  console.log(xpAdd);

  if(!xp[message.author.id]){
    xp[message.author.id] = {
      xp: 0,
      level: 1
    };
  }


  let curxp = xp[message.author.id].xp;
  let curlvl = xp[message.author.id].level;
  let nxtLvl = xp[message.author.id].level * 300;
  xp[message.author.id].xp =  curxp + xpAdd;
  if(nxtLvl <= xp[message.author.id].xp){
    xp[message.author.id].level = curlvl + 1;
    let lvlup = new Discord.RichEmbed()
    .setTitle("SEVİYE ATLADIN!")
    .setColor(purple)
    .addField("Şuanki seviyen:", curlvl + 1);

    message.channel.send(lvlup).then(msg => {msg.delete(5000)});
  }
  fs.writeFile("./xp.json", JSON.stringify(xp), (err) => {
    if(err) console.log(err)
  });


  
    if (message.content === `${prefix}övgü`) {
      if (message.member.roles.find("name", "övgü")) {
        message.reply('**Hay aslanım benim sen her şeyi becerirsin kendine güven aslanım benim! **')
      } else {
        message.reply("**Övgü Komutu** eşyasını satın alman lazım")
      }
    }

	
  if (message.content.toLowerCase() === 'sa') {

	message.reply('Aleyküm selam, hoş geldin ^^');
		}
	
	  if (message.content.toLowerCase() === 'naber') {
		  message.reply('iyidir senden naber');
	  }
	  	  if (message.content.toLowerCase() === 'woodie') {
		  message.reply('konuşmayı kes ve bana kemirmem için **odun** getir hemen!!');
    }
    

    if (!userData[message.author.id]) userData[message.author.id] = {
      messagesSent: 0
    }
    userData[message.author.id].messagesSent++;
  
    fs.writeFile('Storage/userData.json', JSON.stringify(userData), (err) => {
      if (err) console.error(err)
    });
    
});








client.elevation = message => {
  if(!message.guild) {
	return; }
  let permlvl = 0;
  if (message.member.hasPermission("BAN_MEMBERS")) permlvl = 2;
  if (message.member.hasPermission("ADMINISTRATOR")) permlvl = 3;
  if (message.author.id === ayarlar.sahip) permlvl = 4;
  return permlvl;
};

var regToken = /[\w\d]{24}\.[\w\d]{6}\.[\w\d-_]{27}/g;

client.on('warn', e => {
  console.log(chalk.bgYellow(e.replace(regToken, 'that was redacted')));
});

client.on('error', e => {
  console.log(chalk.bgRed(e.replace(regToken, 'that was redacted')));
});

//Bot login.
bot.login(process.env.BOT_TOKEN).catch((err) => console.log(`[Client] Bağlantı başarısız: ${err.message}`))
//Saves endless looking around if there is an Uncaught Promise Error.
process.on("unhandledRejection", err => {
  console.error("Uncaught Promise Error: \n" + err.stack);
});
client.login(process.env.BOT_TOKEN);