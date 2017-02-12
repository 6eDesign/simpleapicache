var config = module.exports = { }; 

config.port = 3003;
config.redisHost = '127.0.0.1'; 
config.redisPort = '6379';
config.cache = require('./cache'); 