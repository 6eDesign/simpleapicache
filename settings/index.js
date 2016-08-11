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
  defaults: { 
    duration: settings.t.weeks, 
    group: 'simple_cache_unclassified'
  }
};