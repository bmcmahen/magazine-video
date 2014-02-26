/**
 * Module Dependencies
 */

var each = require('each');
var events = require('events');
var BackgroundVideo = require('bg-video');
var PopupVideo = require('popup-video');
var classes = require('classes');
var Youtube = require('youtube');

/**
 * Plugin API
 * 
 * @param  {Magazine} magazine 
 * @param  {Object} options  
 */

module.exports = function(magazine, options){
  options = options || {};
  each(magazine.panes, function(pane){
    new VideoPlayback(pane);
  });
}


/**
 * Video Playback Constructor
 * 
 * @param {Pane} pane 
 */

function VideoPlayback(pane){
  this.pane = pane;
  this.el = pane.el;

  this.paneEvents = events(pane, this);
  this.paneEvents.bind('close');
  this.paneEvents.bind('active');
  this.paneEvents.bind('inactive');

  this.events = events(this.el, this);
  this.events.bind('click [data-play-video]', 'playVideoURL');
  this.events.bind('click [data-play-youtube]', 'playYouTube');
  this.events.bind('click [data-toggle-playback]', 'togglePlayback');

  this.autoplay();
}

VideoPlayback.prototype.onclose = function(){
  this.events.unbind();
  this.docEvents.unbind();
};

VideoPlayback.prototype.onactive = function(){
  if (!this.autoplay) return;
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
    this.autoplay = true;
    url = el.getAttribute('data-background-video');
    this.playVideo(el, el, url);
  }
};



VideoPlayback.prototype.playVideo = function(target, wrapper, url){
  // this isn't very good. it assumes that we only have one video
  // container per page, and that the video will be of the same
  // type... needs a rewrite.

  this.noHide = target.getAttribute('data-no-hide');

  if (this.video) {
    this.video.src(url);
    this.video.play();
  } else {
    this.video = new BackgroundVideo(wrapper, url);
    target.getAttribute('data-video-loop') && this.video.loop();
    this.video.append();
  }


  // create a popup video?
  var popupVideo = target.getAttribute('data-popup-video');
  if (popupVideo) this.createPopupVideo(popupVideo);
  else if (this.popup) this.popup.remove();

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

VideoPlayback.prototype.playYouTube = function(target, wrapper, url){
  this.youtube = new Youtube(url, wrapper);
  var popup = target.getAttribute('data-popup-video');
  if (popup) {
    this.createPopupVideo(popup);
  } else if (this.popup) {
    this.popup.remove();
  }
};

// Should popups be in the dom? this will be sloooow...
VideoPlayback.prototype.createPopupVideo = function(popupVideo){
  var list = document.querySelector(popupVideo).children;
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
  this.popup = new PopupVideo(this.video.video, json).pauseOnHover();
}

VideoPlayback.prototype.playVideoURL = function(e){
  e.preventDefault();
  var target = e.target;
  var url = target.getAttribute('data-play-video');
  var wrapper = target.getAttribute('data-video-wrapper');
  var el = document.querySelector(wrapper);
  this.autoplay = false;
  this.playVideo(target, el, url);
};

VideoPlayback.prototype.playYouTube = function(e){
  e.preventDefault();
  var target = e.target;
  var url = target.getAttribute('data-play-youtube');
  var wrapper = target.getAttribute('data-video-wrapper');
  var el = document.querySelector(wrapper);
  this.autoplay = false;
  this.playYouTube(target, el, url);
};



VideoPlayback.prototype.onpause = function(){
  classes(this.el).remove('video-playing');
  classes(this.el).remove('video-nohide');
  this.video.isPlaying = false;
};

VideoPlayback.prototype.onplay = function(){
  if (this.noHide) { classes(this.el).add('video-nohide'); }
  else { classes(this.el).remove('video-nohide'); }
  classes(this.el).add('video-playing');
  this.video.isPlaying = true;
};

VideoPlayback.prototype.resizeVideo = function(){
  this.video.calcSize();
};

VideoPlayback.prototype.togglePlayback = function(e){
  if (e) e.preventDefault();
  if (this.video.isPlaying) {
    this.video.pause();
  } else {
    this.video.play();
  }
};

