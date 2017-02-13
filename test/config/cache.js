var redis = require('redis')
  , config = require('./index')
  , simplecache = require('../../index')
  , cluster = require('cluster');   

var client = redis.createClient({
  host: config.redisHost, 
  port: config.redisPort
});

// if(cluster.isMaster) { 
//   var RedisNotifier = require('redis-notifier')
//   var redisEvents = new RedisNotifier(redis, { 
//     redis: { host: config.redisHost, port: config.redisPort }, 
//     expired: true, 
//     evicted: true,
//     logLevel: 'ERROR'
//   });
//   redisEvents.on('message',function(pattern,channelPattern,emittedKey){
//     simplecache.event.apply(this,arguments);
//   });
// }

var debugOn = false; 

var options = {
  debug: debugOn,                         // if true, enables console output 
  defaultDuration: 3600000,               // should be a number (in ms), defaults to 1 hour 
  enabled: true,                          // if false, turns off caching globally (useful on dev) 
  appendKey: [],                          // if you want the key (which is the URL) to be appended by something in the req object, put req properties here that point to what you want appended. I.E. req.session.id would be ['session', 'id'] 
  redisClient: client
};

simplecache.configure(options);

module.exports = simplecache; 