var _ = require('lodash')
  , settings = require('./settings')
  , helpers = require('./lib/helpers'); 

var app = module.exports = { }; 

var checkForBypass = function(req,res,next) { 
  req.simplecachebypass = !req.simplecache.opts.redisClient || req.headers['x-apicache-bypass']; 
  next(); 
}; 

var getCacheKey = function(req,res,next) { 
  req.simplecache.key = req.originalUrl || req.url;
  next(); 
};

var serveFromCache = function(req,res,next) {
  if(req.simplecachebypass) return next(); 
  var sc = req.simplecache;
  sc.opts.redisClient.del(sc.key);
  sc.opts.redisClient.hgetall(sc.key, function (err, obj) {
    if(err && sc.opts.debug) {
      console.log('[api-cache] [redis-error]: ' + err);
    }
    // todo: also check if expired: 
    if(obj && obj.responseObj){
      var respObj = JSON.parse(obj.responseObj);
      res.statusCode = respObj.status;
      res.set(JSON.stringify(respObj.headers));
      if(sc.opts.debug) { 
        console.log('[api-cache] Found "' + sc.key + '" in redis cache.'); 
      }
      return res.send(respObj.body);
    }
    next(); 
  });
}; 

var getHeaders = function(res) { 
  var headers = { 'Content-Type': 'application/json; charset=utf-8' }; 
  _.each(['Cache-Control', 'Expires'], function(h) {
    var header = res.get(h);
    if (!_.isUndefined(header)) {
      headers.headers[h] = header;
    }
  });
  return headers;
}; 

var saveToCache = function(req,res,json,headers) {
  var sc = req.simplecache; 
  var obj = {
    headers,
    responseObj: json, 
    status: res.statusCode
  }; 
  console.log('____obj', JSON.stringify(obj,null,2));
  sc.opts.redisClient.hset(sc.key, "responseObj", JSON.stringify(obj));
  sc.opts.redisClient.hset(sc.key, "duration", sc.duration);
}; 

var setupWatcher = function(req,res,next) { 
  if(req.simplecachebypass) return next(); 
  res._ogJson = res.json;
  res.json = function(json) { 
    saveToCache(req,res,json,getHeaders(res)); 
    console.log('_________________need to cache this shit yo',res.statusCode, json);
    res._ogJson(json);
  }; 
  next(); 
}; 

app.configure = function(config) { 
  _.merge(settings.config,config);
}; 

app.mw = function(duration){
  var storeState = (req,res,next) => { 
    req.simplecache = { 
      opts: settings.config, 
      duration: helpers.interpretCacheDuration(duration)
    }; 
    next();
  };
  return [ 
    storeState, 
    checkForBypass, 
    getCacheKey, 
    serveFromCache, 
    setupWatcher 
  ];
};