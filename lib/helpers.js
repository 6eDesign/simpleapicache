var ms = require('millisecond')
  , settings = require('../settings')
  , config = settings.config; 


var getRedisObj = function(key,obj,cb) { 
  if(obj) return cb(null,obj); 
  config.redisClient.hgetall(key,cb);
}; 

var helpers = module.exports = { };

helpers.interpretCacheDuration = function(str,opts) {
  var duration = opts.duration
  if(!isNaN(str)) str = parseInt(str);  
  switch(typeof str) { 
    case 'string': 
      var translation = ms(str); 
      if(translation) duration = translation;
      break;
    case 'number': 
    default: 
      if(str && str !=0) duration = str;    
      break; 
  }
  return duration;
};

helpers.log = function(str,group) { 
  if(settings.config.debug) {
    console.log('[api-cache] ' + (group ? '['+group +'] ' : '') + str); 
  }
};

helpers.removeFromCache = function(key,obj) { 
  getRedisObj(key,obj,function(err,obj) { 
    if(err) { 
      helpers.log('Error removing item from redis cache for key="' + key + '"');
      return; 
    }
    console.log(obj);
  });
}; 

helpers.saveToCache = function(obj,sc) { 
  helpers.log('Saving response for "' + sc.key + '" in redis.',obj.group);
  config.redisClient.hset(sc.key, "responseObj", JSON.stringify(obj));
  config.redisClient.hset(sc.key, "duration", sc.duration);
  config.redisClient.sadd(config.keyStoreKey,sc.key);
  // config.redisClient.sadd(config.groupStoreKey,obj.group);
}; 