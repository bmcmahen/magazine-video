var each = require('each');
var events = require('events');
var BackgroundVideo = require('background-video');
var PopupVideo = require('popup-video');

module.exports = function(magazine, options){
  options = options || {};
  each(magazine.panes, function(pane){
    new VideoPlayback(pane);
  });
}

function VideoPlayback(pane){
  this.pane = pane;
  this.el = pane.el;

  this.paneEvents = events(pane, this);
  this.paneEvents.bind('close');
  this.paneEvents.bind('active');
  this.paneEvents.bind('inactive');

  this.events = events(this.el, this);
  this.events.bind('click [data-start-video]', 'playVideoURL');
  this.events.bind('click [data-toggle-playback]', 'togglePlayback');

  this.autoplay();
}

VideoPlayback.prototype.onclose = function(){
  this.events.unbind();
  this.docEvents.unbind();
};

VideoPlayback.prototype.onactive = function(){
  if (this.video && this.el.getAttribute('data-autoplay'))
    this.video.play();
};

VideoPlayback.prototype.oninactive = function(){
  if (this.video) this.video.pause();
};

VideoPlayback.prototype.autoplay = function(){
  // 1. Video that automatically plays in the background.
  var url;
  var el = this.el.getAttribute('data-background-video')
    ? this.el
    : this.el.querySelector('[data-background-video]');

  if (el) {
    url = el.getAttribute('data-background-video');
    this.playVideo(el, el, url);
  }
};

VideoPlayback.prototype.playVideo = function(target, wrapper, url){
  if (this.video) this.video.close();
  this.video = new BackgroundVideo(wrapper, url);
  if (target.getAttribute('data-video-loop')){
    this.video.loop();
  }
  this.video.append();

  // create a popup video?
  var popupVideo = target.getAttribute('data-popup-video');
  if (popupVideo) createPopupVideo.call(this, popupVideo);

  // bind resize events & video events
  if (!this.docEvents) {
    this.docEvents = events(window, this);
    this.docEvents.bind('resize', 'resizeVideo');
  }

  // this allows us to remove certain elements during video
  // playback, by adding a class to the el.
  if (this.videoEvents) this.videoEvents.unbind();
  this.videoEvents = events(this.video.video, this);
  this.videoEvents.bind('play', 'onplay');
  this.videoEvents.bind('pause', 'onpause');
  this.videoEvents.bind('end', 'onpause');
  this.videoEvents.bind('stop', 'onpause');
};

// Should popups be in the dom? this will be sloooow...
VideoPlayback.prototype.createPopupVideo = function(popupVideo){
  if (this.popup) this.popup.remove();
  var list = document.querySelector(popupVideo).childNodes;
  var json = {};
  each(list, function(item){
    var time = item.getAttribute('data-start-time');
    var duration = item.getAttribute('data-duration');
    var content = item.innerHTML;
    json[time] = {
      duration: duration,
      html: content
    };
  });
  this.popup = new PopupVideo(this.video.video, json);
}

VideoPlayback.prototype.playVideoURL = function(e){
  e.preventDefault();
  var target = e.target;
  var url = target.getAttribute('data-start-video');
  var wrapper = target.getAttribute('data-video-wrapper');
  var el = document.querySelector(wrapper);
  playVideo.call(this, target, el, url);
};

VideoPlayback.prototype.onpause = function(){
  classes(this.el).remove('video-playing');
  this.video.isPlaying = false;
};

VideoPlayback.prototype.onplay = function(){
  classes(this.el).add('video-playing');
  this.video.isPlaying = true;
};

VideoPlayback.prototype.resizeVideo = function(){
  this.video.calcSize();
};

VideoPlayback.prototype.togglePlayback = function(e){
  if (e) e.preventDefault();
  if (this.video.isPlaying) {
    this.pauseVideo();
  } else {
    this.playVideo();
  }
};

