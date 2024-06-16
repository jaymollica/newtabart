$(document).ready(function() {

  var aic = {
    museum: "Art Institute of Chicago",
    shortname: "aic",
    endPoint: "https://api.artic.edu/api/v1/artworks/",
    docs: "https://api.artic.edu/docs/",
    maxInt: "125841",
    maxPage: "10487",

    //https://www.artic.edu/iiif/2/2d484387-2509-5e8e-2c43-22f9981972eb/full/843,/0/default.jpg

    returnData: function(data) {

      if (data.length == 0 || data.data.length == 0) {
        return data.imgPath = '';
      }

      if(data.data[0].image_id) {

        var img_base_url = data.config.iiif_url;
        var img_id = data.data[0].image_id;
        var img_url = img_base_url+"/"+img_id+"/full/843,/0/default.jpg"

      }
      else {
        img_url = null;
      }
      
      var aicData = {
        imgPath: img_url || '',
        artistCulture: data.data[0].artist_display || '',
        title: data.data[0].title,
        nationality: data.data[0].place_of_origin || '',
        objectDate: data.data[0].date_display || '',
        objectURL: data.data[0].api_link,
        culture: data.data[0].category_titles || '',
        description: data.data[0].description || '',
        museumName: this.museum,
        docs: this.docs,
      };

      return aicData;


    }

  };

  var cma = {
    museum:"Cleveland Museum of Art",
    shortname:"cma",
    endPoint:"https://openaccess-api.clevelandart.org/api/artworks/",
    docs: "https://openaccess-api.clevelandart.org/",
    maxInt:"29144",
    returnData: function(data) {
      if (data.length == 0 || data.data.length == 0) {
        return data.imgPath = '';
      }

      data = data.data[0];
      if(data.wall_description === 'null') {
        wall_description = '';
      }
      else {
        wall_description = data.wall_description;
      }

      if(data.creators.length == 0) {
        artist = '';
      }
      else {
        artist = data.creators[0].description;
      }

      var cmaData = {
        imgPath: data.images.web.url || '',
        artistCulture: artist || '',
        title: data.title,
        nationality: data.artistNationality || '',
        objectDate: data.creation_date || '',
        objectURL: data.url || '',
        culture: data.culture[0] || '',
        description: wall_description || '',
        museumName: this.museum,
        docs: this.docs,
      };

      return cmaData;
    }
  };

  var met = {
    museum:"Metropolitian Museum of Art",
    shortname: "met",
    endPoint:"https://collectionapi.metmuseum.org/public/collection/v1/objects/",
    docs: "https://metmuseum.github.io/",
    maxInt:"471581",
    returnData: function(data) {

      var metData = {
        imgPath: data.primaryImageSmall || '',
        artistCulture: data.artistDisplayName || '',
        title: data.title,
        nationality: data.artistNationality || '',
        objectDate: data.objectDate || '',
        objectURL: data.objectURL || '',
        culture: data.culture || '',
        description: data.wall_description || '',
        museumName: this.museum,
        docs: this.docs,
      };

      return metData;

    }
  };

  var museums = {"aic": aic, "met": met, "cma": cma};
  //var museums = {"aic": aic};

  var randomProperty = function (obj) {
    var keys = Object.keys(obj)
    return obj[keys[ keys.length * Math.random() << 0]];
  };
  //var randMuseum = randomProperty(museums);
  var randMuseum = randomProperty(museums);  
  
  function getRandomInt(museum) {
    if(museum.shortname == "aic") {
      var randInt = Math.floor(Math.random() * Math.floor(museum.maxInt));
      var objURL = museum.endPoint+"?limit=1&page="+randInt;
      //objectURL = "https://api.artic.edu/api/v1/artworks/27992";
    }
    if (museum.shortname == "cma") {
      var randInt = Math.floor(Math.random() * Math.floor(museum.maxInt));
      var objURL = museum.endPoint+"?has_image=1&limit=1&skip="+randInt;
    }
    if (museum.shortname == "met") {
      var randInt = Math.floor(Math.random() * Math.floor(museum.maxInt));
      var objURL = museum.endPoint+randInt;
    }
    return objURL;
  }

  makeRequest(randMuseum);

  function makeRequest(randMuseum) {
    var request = new XMLHttpRequest();

    var randObject = getRandomInt(randMuseum);

    request.open('GET', randObject, true);

      request.onload = function() {
      // Begin accessing JSON data here
      var data = JSON.parse(this.response);
        if (request.status >= 200 && request.status < 400) {
          var returnData = randMuseum.returnData(data);
          
          //return;
          if(returnData.imgPath === '') {
            makeRequest(randMuseum);
            // no img for that ID
          }
          else {
            insertArt(returnData);
          }
        } else {
          var newRand = getRandomInt(randMuseum.maxInt);
          makeRequest(randMuseum);
          // no artwork for that ID
        }
      }
    // Send request
    request.send();
  }

  function insertArt(data) {

    var imgPath = data.imgPath;
    var artistCulture = data.artistCulture;
    var objectDate = data.objectDate;
    var title = data.title;
    var nationality = data.nationality;
    var culture = data.culture;
    var docs = data.docs;
    var museumName = data.museumName;
    var objDescription = data.description || "";

    if (objectDate === '') {
      objectDate = '';
    }
    else {
      // append comma to title if date exists
      title = title+', ';
    }

    // if there's no artisit then let's try culture
    if(artistCulture === '') {
      artistCulture = culture;
    }

    var objectLink = $('<div class="objectLink">');

    // create image element
    var imgContainer = $('<div class="imgContainer">');
    preloadImg(imgPath);
    
    $('<img style="display: none;" src="'+imgPath+'">').on('load', function(){
      // hide/remove the loading image
      $(this).appendTo(imgContainer).fadeIn(1000);
    });
    // append image
    $(imgContainer).appendTo(objectLink); 

    // create caption element
    var captionContainer = $('<div class="captionContainer">');
    var topLine = $('<p class="topLine"><span class="title">'+title+'</span><span class="date">'+objectDate+'</span></p>').appendTo(captionContainer);
    var bottomLine = $('<p><span class="artist">'+artistCulture+'</span> <span class="nationality">'+nationality+'</span></p>').appendTo(captionContainer);

    var pathContainer = $('<p class="sourceLinkContainer"><a class="sourceLink" href="'+data.objectURL+'">'+data.objectURL+'</a></p>').appendTo(captionContainer);
    // append caption
    $(captionContainer).appendTo(objectLink);

    if(objDescription) {
      console.log(objDescription);
      var objDescContainter = $('<p class="objectDescriptionContainer"></p>');
      var objDescSpan = $('<span class="objectDescription"></span>');

      $(objDescSpan).html(objDescription);

      $(objDescSpan).appendTo(objDescContainter);


      console.log(objDescContainter);

      $(objDescContainter).appendTo(captionContainer);
    }

    var description = $('<p class="descriptionContainer"><span class="description">This artwork is sourced from the <a href="'+docs+'">'+museumName+' Collection API</a>. This browser extenstion is not affialiated with the museum. The source code for the extension can be found on <a href="https://github.com/jaymollica/newtabart">github</a>.</span></p>');
    $(description).appendTo(captionContainer);

    // add it all to the page
    $(objectLink).appendTo('#objectContainer');

  }

  function preloadImg(url) {
    (new Image()).src = url;
    //return img;
  }

});