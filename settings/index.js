var settings = module.exports = { 
  t: {
    seconds:      1000,
    minutes:      60000,
    hours:        3600000,
    days:         3600000 * 24,
    weeks:        3600000 * 24 * 7,
    months:       3600000 * 24 * 30,
    years:        3600000 * 24 * 365,
  }
}; 

settings.config = { 
  store: 'redis', 
  debug: true,
  enabled: true,
  keyStoreKey: 'simpleapicachekeys',
  groupStoreKey: 'simpleapicachegroups',
  defaults: { 
    duration: settings.t.weeks, 
    group: 'simple_cache_unclassified', 
    getCacheKey: function(req,res,next) { 
      if(req.simplecachebypass) return next(); 
      req.simplecache.key = req.originalUrl || req.url;
      next(); 
    }
  }
};