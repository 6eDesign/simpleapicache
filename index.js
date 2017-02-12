var _ = require('lodash')
  , settings = require('./settings')
  , config = settings.config
  , async = require('async')
  , helpers = require('./lib/helpers'); 

var app = module.exports = { }; 

var checkForBypass = function(req,res,next) { 
  req.simplecachebypass = !config.redisClient || req.headers['x-apicache-bypass']; 
  next(); 
}; 

var serveFromCache = function(req,res,next) {
  if(req.simplecachebypass) return next(); 
  var sc = req.simplecache;
  config.redisClient.hgetall(sc.key, function (err, obj) {
    if(err) {
      helpers.log('[redis-error]: ' + err);
      return next();
    }
    if(obj && obj.responseObj){
      var respObj = JSON.parse(obj.responseObj);
      if(Date.now() <= respObj.exp) { 
        res.statusCode = respObj.status;
        Object.keys(respObj.headers).forEach((key) => res.set(key,respObj.headers[key])); 
        helpers.log('Serving "' + sc.key + '" from redis cache.',respObj.group); 
        if(req.simplecache.opts.postware) {
          req.data = respObj.json; 
          return req.simplecache.opts.postware(req,res,(err) => {
            res.send(req.data); 
          });
        }
        return res.send(respObj.json);
      } 
    }
    next(); 
  });
}; 

var getHeaders = function(res) { 
  var headers = { 'Content-Type': 'application/json; charset=utf-8' }; 
  _.each(['Cache-Control', 'Expires'], function(h) {
    var header = res.get(h);
    if (!_.isUndefined(header)) {
      headers[h] = header;
    }
  });
  return headers;
}; 

var saveToCache = function(req,res,json,headers) {
  var sc = req.simplecache; 
  var obj = {
    headers,
    json, 
    status: res.statusCode, 
    group: typeof req.apicacheGroup != 'undefined' ? req.apicacheGroup : config.defaults.group, 
    exp: Date.now() + sc.duration
  };
  helpers.saveToCache(obj,sc);
}; 

var setupWatcher = function(req,res,next) { 
  if(req.simplecachebypass) return next(); 
  res._ogJson = res.json;
  res.json = function(json) { 
    if((res.statusCode >= 200 && res.statusCode < 300) || res.statusCode === 304 ) saveToCache(req,res,json,getHeaders(res));
    res._ogJson(json);
  }; 
  next(); 
}; 

app.configure = function(conf) { 
  _.merge(config,conf);
}; 

app.mw = function(duration,opts){
  opts = typeof opts == 'undefined' ? config.defaults : _.merge({},config.defaults,opts);
  var storeState = (req,res,next) => { 
    if(typeof req.apicacheGroup != 'undefined') opts.group = req.apicacheGroup; 
    req.simplecache = { 
      opts: opts, 
      duration: helpers.interpretCacheDuration(duration,opts)
    }; 
    next();
  };
  return [ 
    storeState, 
    checkForBypass, 
    opts.getCacheKey, 
    serveFromCache, 
    setupWatcher 
  ];
};

var getKeyData = function(obj) {
  return function(key,cb) { 
    config.redisClient.hgetall(key,function(err,result){
      if(err) return cb(err); 
      if(result) { 
        if(result && result.responseObj) {
          result.responseObj = JSON.parse(result.responseObj);
          obj[result.responseObj.group] = obj[result.responseObj.group] || [ ]; 
          obj[result.responseObj.group].push({url: key}); 
        }
      }
      cb();
    });
  };  
}; 

var deleteArrayFromHset = function(set,keys,cb) { 
  var args = [ set ]; 
  keys.forEach(function(key){
    args.push(key); 
  });
  args.push(cb); 
  config.redisClient.srem.apply(this,args); 
}; 

var clearAllInGroup = function(groups) { 
  return function(group,cb) { 
    helpers.log('Removing cache group: ' + group + ' and its ' + groups[group].length + ' items');
    var targets = groups[group].map(function(item) { return group + ':' + item.url});
    config.redisClient.del(targets,function(err,count){
      if(err) return cb(err); 
      async.eachLimit(groups[group],10,function(item,icb){
        var key = group.toString() + ':' + item.url; 
        config.redisClient.srem(config.keyStoreKey,key,function(err){
          icb(err);
        });
      },function(err){
        delete groups[group];
        cb(err);
      });
    }); 
  };
}; 
 
var getGroups = function(req,res,next) { 
  var start = Date.now(); 
  config.redisClient.smembers(config.keyStoreKey,function(err,keys){
    if(err) return next(err);
    var obj = { }; 
    for(var i=0; i < keys.length; ++i) { 
      var group = keys[i].match(/[^:]*/i)[0]; 
      var url = keys[i].replace(group + ':', ''); 
      obj[group] = obj[group] || []; 
      obj[group].push({url: url});
    }
    req.groups = obj; 
    next();
  });
}; 

var purgeGroups = function(req,res,next) { 
  var groups = Object.keys(req.groups);
  async.each(groups,clearAllInGroup(req.groups),function(err){
    if(err) return next(err);
    res.json(req.groups);
  });
}; 

var purgeGroup = function(req,res,next) { 
  async.each([req.params.group],clearAllInGroup(req.groups),function(err){
    if(err) return next(err); 
    res.json(req.groups);
  });
}; 

app.getIndexesMW = function() {
  return [ getGroups, (req,res) => res.json(req.groups) ];  
};

app.purgeAllMW = function() { 
  return [ getGroups, purgeGroups ]; 
}; 

app.purgeGroupMW = function() { 
  return [ getGroups, purgeGroup ]; 
};