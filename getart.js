$(document).ready(function() {

  var maxInt = 471581; // number of objects in met collection at time of creation

  function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
  }

  var randObject = getRandomInt(maxInt);

  makeRequest(randObject);

  function makeRequest(randObject) {
    var request = new XMLHttpRequest();

    request.open('GET', 'https://collectionapi.metmuseum.org/public/collection/v1/objects/'+randObject, true);

      request.onload = function() {
      // Begin accessing JSON data here
      var data = JSON.parse(this.response);

        if (request.status >= 200 && request.status < 400) {
          if(data.primaryImageSmall === '') {
            var newRand = getRandomInt(maxInt);
            makeRequest(newRand);
          }
          else {
            insertArt(data);
          }
        } else {
          var newRand = getRandomInt(maxInt);
          makeRequest(newRand);
          // no artwork for that ID
        }
      }
    // Send request
    request.send();
  }

  function insertArt(data) {

    path = data.primaryImageSmall;
    var objectLink = $('<div class="objectLink">');

    var artistCulture = data.artistDisplayName;
    var objectDate = data.objectDate;
    var title = data.title;
    var nationality = data.artistNationality;
    var culture = data.culture;

    if (objectDate === '') {
      objectDate = '';
    }
    else {
      // append comma to title if date exists
      title = title+', ';
    }

    // if there's no artisit then let's try culture
    if(artistCulture === '') {
      artistCulture = data.culture;
    }

    // create image element
    var imgContainer = $('<div class="imgContainer">');
    var objImage = $('<img src="'+path+'" />').appendTo(imgContainer);
    // append image
    $(imgContainer).appendTo(objectLink); 

    // create caption element
    var captionContainer = $('<div class="captionContainer">');
    var topLine = $('<p class="topLine"><span class="title">'+title+'</span><span class="date">'+objectDate+'</span></p>').appendTo(captionContainer);
    var bottomLine = $('<p><span class="artist">'+artistCulture+'</span> <span class="nationality">'+nationality+'</span></p>').appendTo(captionContainer);

    var pathContainer = $('<p class="sourceLinkContainer"><a class="sourceLink" href="'+data.objectURL+'">'+data.objectURL+'</a></p>').appendTo(captionContainer);
    // append caption
    $(captionContainer).appendTo(objectLink);

    var description = $('<p class="descriptionContainer"><span class="description">All artworks are sourced from the <a href="https://metmuseum.github.io/">Metropolitian Museum of Art Collection API</a>. This browser extenstion is not affialiated with the museum. The source code for the extension can be found on <a href="https://github.com/jaymollica/newtabart">github</a>.</span></p>');
    $(description).appendTo(captionContainer);

    // add it all to the page
    $(objectLink).appendTo('#objectContainer');

  }

});