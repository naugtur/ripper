/*!
 * Ripper.js v0.1
 * Copyright 2012, Zbigniew Tenerowicz, naugtur.pl
 * MIT License, see license.txt
 */

var Ripper = function(S) {
  'use strict';

  S || (S = {});
  S.dictionary || (S.dictionary = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!~*;:/$,-_");
  S.numberLength || (S.numberLength = 2);
  S.heuristic || (S.heuristic = false);
  S.keepJS || (S.keepJS = false);
  S.compressToArray || (S.compressToArray = false);
  //------------------------------------------------------------------- /Math
  var M = (function() {
    var c = (S.dictionary).split(""),
    b = S.dictionary.length;

    //creates a converter function that translates numbers to base(dictionary.length) which can be more than base64

    function makeConverter(l) { //factory for a l-character converter
      var max;

      if (l === 2) { //case of 2 chars - unrolled for performance
        max = b * b;
        return function(n) {
          if (typeof(n) !== 'number') {
            return ''
          }
          var s = "";
          if (n >= max) {
            throw 'Number too big to convert. Use bigger dictionary or numberLength.';
          }
          s = c[n % b];
          n = Math.floor(n / b);
          s = c[n % b] + s;
          return s;
        };
      } else {
        max = Math.pow(b, l); //init once
        return function(n) {
          if (typeof(n) !== 'number') {
            return ''
          }
          var s = "";
          if (n >= max) {
            throw 'Number too big to convert. Use bigger dictionary or numberLength.';
          }
          for (var i = 0; i < l; i += 1) {
            s = c[n % b] + s;
            n = Math.floor(n / b);
          }
          return s;
        };
      }
    }

    //for any length of input converts it to proper integer based on dictionary

    function reverseConverter(x) {
      var ret = 0;
      for (var i = 1; x.length > 0; i *= b) {
        ret += S.dictionary.indexOf(x.charAt(x.length - 1)) * i;
        x = x.substr(0, x.length - 1);
      }
      return ret;
    }

    return {
      makeConverter: makeConverter,
      reverseConverter: reverseConverter
    }
  })();


  //------------------------------------------------------------------- /CSS
  var CSS = (function() {

    var defaultsStore = {}, prefix;

    function getVendorPrefix() {
      if (prefix) {
        return prefix;
      }

      var someScript = document.getElementsByTagName('script')[0],
          pfxRegex = /^(Moz|Webkit|Khtml|O|ms)(?=[A-Z])/;

      for(var prop in someScript.style) {
        if(pfxRegex.test(prop)) {
          // test is faster than match, so it's better to perform
          // that on the lot and match only when necessary
          return prefix = prop.match(pfxRegex)[0];
        }
      }

      // Nothing found so far? Webkit does not enumerate over the CSS properties of the style object.
      // However (prop in style) returns the correct value, so we'll have to test for
      // the precence of a specific property
      if('WebkitOpacity' in someScript.style) return prefix = 'Webkit';
      if('KhtmlOpacity' in someScript.style) return prefix = 'Khtml';

      return prefix = '';
    }
    
    //replace -rr- prefix to the one used by current browser, or to optionally specified one
    function prefixify(value, prefix) {
      if (typeof prefix === "undefined") {
        prefix = '-' + getVendorPrefix().toLowerCase() + '-';
      }
      return value.replace(/(^|[\s,])-rr-/, prefix);
    }

    //change aaa-bbb into aaaBbb
    function camelize(prop) {
      prop = prefixify(prop, getVendorPrefix()+'-'); // we can't use -prefix- notation here, because in JS side one of the prefixes starts with lowercase. It's "ms" - what a surprise!
      var rep = function(a, b) {
        return b.toUpperCase();
      };
      return prop.replace(/\-([a-z])/g, rep);
    };

    function getStyleObject(dom) {
      var style, returns = {};
      if (window.getComputedStyle) {
        style = window.getComputedStyle(dom, null);
        for (var i = 0, l = style.length; i < l; i += 1) {
          var prop = style[i],
          val = style.getPropertyValue(prop);
          returns[prop] = val;
        }
        return returns;
      }
      if (style = dom.currentStyle) {
        for (var prop in style) {
          returns[prop] = style[prop];
        }
        return returns;
      }
      if (style = dom.style) {
        for (var prop in style) {
          if (typeof style[prop] != 'function') {
            returns[prop] = style[prop];
          };
        };
        return returns;
      };
      return returns;


    }

    //Single instance sandbox iframe
    var getSandbox = (function() {
      var ifr, iframeSandbox = false;
      ifr = document.createElement('iframe');
      ifr.style.display = 'none';
      document.documentElement.appendChild(ifr);
      return function() {
        if (iframeSandbox) {
          return iframeSandbox;
        } else {
            
          iframeSandbox = ifr.contentDocument.body;
          return iframeSandbox;
        }
      };
    })();


    //memoized function to get the default style of an element
    //TODO [not sure anymore] prefetch styles for some form elements eg. putting OPTION in SELECT

    function memDefaults(tag, type) {
      var key = tag + type;
      if (defaultsStore[key]) {
        return defaultsStore[key];
      } else {
        //get styles for defaults
        var sandBox = getSandbox(),
        e = document.createElement(tag);
        type && (e.type = type);
        e.style.visibility = 'hidden';
        sandBox.appendChild(e);
        defaultsStore[key] = getStyleObject(e);
        defaultsStore[key].visibility = 'visible';
        sandBox.removeChild(e);
        return defaultsStore[key];
      }
    }

    //returns non-default styles for element
    // e is the element

    function getDiff(e) {
      var styles = getStyleObject(e),
      nn = e.nodeName,
      defaults, r = false; //result not empty
      if (nn === 'INPUT') {
        defaults = memDefaults(nn, e.getAttribute('type'));
      } else {
        defaults = memDefaults(nn, '');
      }

      for (var i in defaults) {
        if (defaults.hasOwnProperty(i)) {
          if (styles[i] === defaults[i]) {
            delete styles[i];
          } else {
            styles[i]=prefixify(styles[i], '-rr-');
            if(i.substr(0,1)==='-'){
              styles[i.replace(/^-[a-z]*-/,'-rr-')]=styles[i];
              delete(styles[i]);
            }
            //something remains
            r = true;
              
          }
        }
      }
  
      if(styles['cssFloat']){
          styles['float']=styles['cssFloat'];
          delete styles['cssFloat'];
      }

      return (r) ? styles : {};
    }


    return {
      get: getDiff,
      camelize:camelize,
      prefixify: prefixify
    }

  })();

  //------------------------------------------------------------------- /Heuristic Compress
  var Heuristic = (function() {

    var z = {},
    dictionary = ['color', 'div', 'border', 'font', 'text', 'origin', 'left', 'width', 'right', 'bottom', 'size', 'height', 'family', 'padding', 'transform', 'perspective', 'align', 'none', 'type', 'option', 'background', 'value', 'collapse', 'margin', 'outline', 'display', 'serif', 'sans', 'solid', 'spacing', 'cursor', 'href', 'Arial', 'auto', 'position', 'block', 'vertical', 'Tahoma', 'span', 'name', 'input', 'line', 'default', 'float', 'label', 'Helvetica', 'hidden', 'horizontal', 'repeat', 'center', 'absolute', 'Verdana', 'recaptcha', 'overflow', 'image', 'relative'],
    //some popular longer words in html and css
    keys = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''); //71       
    //naive compression for html and CSS 

    function compress(text) {
      var result;
      result = text.replace(/~/g, '~~'); //Not too often I guess
      for (var i = 0, l = dictionary.length; i < l; i += 1) {
        result=result.replace(RegExp(dictionary[i], 'g'), '~' + keys[i]);
      }
      return result;
    }

    //decompression

    function decompress(text) {
      var result = text;
      for (var i = 0, l = dictionary.length; i < l; i += 1) {
        result=result.replace(RegExp('~' + keys[i], 'g'), dictionary[i]);
      }
      result=result.replace(/~~/g, '~');
      return result;
    }

    return {
      compress: compress,
      decompress: decompress
    }
  })()

  //------------------------------------------------------------------- /LZW
  var LZW = (function() {
    //setup for basic dictionary
    var rootDict = 382;
    //good characters: ((n>31 && n<127)||n>=160) //TODO later?

    function compress(uncompressed) {
      // Build the dictionary.
      var i, dictionary = {},
      c, wc, w = "",
      result = [],
      dictSize = rootDict;
      for (i = 0; i < rootDict; i += 1) {
        dictionary[String.fromCharCode(i)] = i;
      }

      for (i = 0; i < uncompressed.length; i += 1) {
        c = uncompressed.charAt(i);
        if (c.charCodeAt(0) > rootDict) {
          continue;
        }
        wc = w + c;
        if (dictionary[wc]) {
          w = wc;
        } else {
          result[result.length] = dictionary[w];
          // Add wc to the dictionary.
          dictionary[wc] = dictSize++;
          w = String(c);
        }
      }

      // Output the code for w.
      if (w !== "") {
        result[result.length] = dictionary[w];
      }
      return result;
    }

    function decompress(compressed) {
      // Build the dictionary.
      var i, dictionary = [],
      w, result, k, entry = "",
      dictSize = rootDict;
      for (i = 0; i < rootDict; i += 1) {
        dictionary[i] = String.fromCharCode(i);
      }

      w = String.fromCharCode(compressed[0]);
      result = w;
      for (i = 1; i < compressed.length; i += 1) {
        k = compressed[i];
        if (dictionary[k]) {
          entry = dictionary[k];
        } else {
          if (k === dictSize) {
            entry = w + w.charAt(0);
          } else {
            throw "Unexpected character in decompression";
          }
        }

        result += entry;

        // Add w+entry[0] to the dictionary.
        dictionary[dictSize++] = w + entry.charAt(0);

        w = entry;
      }
      return result;
    }

    return {
      compressToArray: function(txt) {
        return compress(txt);
      },
      decompressFromArray: function(data) {
        for(var i=0;i<data.length;i+=1){
          if(data[i]<32){ //nothing less than space makes sense anyway
            throw "Unexpected entity in decoding";
          }
        }
        return decompress(data);
      },        
      compress: function(txt, cV) {
        return compress(txt).map(function(a) {
          return cV(a)
        }).join('');
      },
      decompress: function(data, dV, chunkSize) {
        //split into chunks of characters
        var tmp = [],val;
        data = data.split('');
        while (data.length) {
          val = dV(data.splice(0, chunkSize).join(''));
          if(val<32){ //nothing less than space makes sense anyway
            throw "Unexpected entity in decoding";
        }
          tmp[tmp.length] = val;
        }
        return decompress(tmp);
      }
    };

  })();
  
  //-------------------------------------------------------------------CSS specific compression
  var CSSompress = (function() {
        function compress(css) {
            var props = [],
                    vals = [],
                    compressed = {};

            for (var key in css) {
                if (css.hasOwnProperty(key)) {
                    compressed[key] = [];

                    for (var prop in css[key]) {
                        if (css[key].hasOwnProperty(prop)) {
                            var val = css[key][prop];

                            var propIndex = props.indexOf(prop),
                                    valIndex = vals.indexOf(val);

                            if (propIndex < 0) {
                                propIndex = props.length;
                                props[propIndex] = prop;
                            }

                            if (valIndex < 0) {
                                valIndex = vals.length;
                                vals[valIndex] = val;
                            }

                            compressed[key].push(propIndex, valIndex);
                        }
                    }
                }
            }

            return {
                props: props,
                vals: vals,
                res: compressed
            };
        }

        function decompress(obj) {
            var props = obj.props,
                vals = obj.vals,
                res = obj.res;

            var decompressed = {};

            for (var key in res) {
                if (res.hasOwnProperty(key)) {
                    decompressed[key] = {};

                    for (var i = 0, maxi = res[key].length; i < maxi; i += 2) {
                        var propIndex = res[key][i],
                                valIndex = res[key][i + 1];

                        var prop = props[propIndex],
                                val = vals[valIndex];

                        decompressed[key][prop] = val;
                    }
                }
            }

            return decompressed;
        }

        return {
            compress: function(data) {
                if ((typeof data) !== 'object') {
                    try {
                        data = JSON.parse(data);
                    } catch (e) {
                        return data;
                    }
                }
                
                return compress(data);
            },
            decompress: function(data) {
                if ((typeof data) !== 'object') {
                    try {
                        data = JSON.parse(data);
                    } catch (e) {
                        
                    }
                }
                
                if(!data.res) {
                    return data;
                } else {
                    return decompress(data);
                }
            }
        }
    })();
  

  //------------------------------------------------------------------- /Main
  //creates a function that runs a callback for every node, recursively, and provides identification

  function makeRecursiveTraverser(callback) {
    var action = callback,
    cV = M.makeConverter(2);

    function recur(e, n, k, u) {
      var x, id = n + '' + cV(k);
      //doing stuff
      action(e, id);

      //go deeper
      k = 0;
      x = e.firstChild;
      for (; x; x = x.nextSibling) {
        if (x !== u && x.nodeType === 1 && (S.keepJS || x.nodeName!=='SCRIPT')) {
          recur(x, id, ++k);
        }
      }
    }
    return recur;
  }

  function mirror(node,preprocess,cssSkipped){
      var htmlContent, tmpdom, scripts;

    tmpdom = document.createElement(node.nodeName);
    tmpdom = node.cloneNode(true);
    if( typeof(preprocess) === 'function' ){
            preprocess(tmpdom);
        }
    
   if(S.keepJS){
    htmlContent = tmpdom.innerHTML;
      if(!cssSkipped){
        //no need for style and class
            htmlContent = htmlContent.replace(/\sstyle=("[^"<]*")|('[^'<]*')/gi, '');
        }
    }else{
        scripts = tmpdom.getElementsByTagName('script');
        var i = scripts.length;
        while (i--) {
          scripts[i].parentNode.removeChild(scripts[i]);
        }
      htmlContent = tmpdom.innerHTML;
        if(cssSkipped){
        htmlContent = htmlContent.replace(/\s(on[^ =]*)=("[^"<]*")|('[^'<]*')/gi, ''); 
        }else{
        //no need for style, drop events
        htmlContent = htmlContent.replace(/\s(style|on[^ =]*)=("[^"<]*")|('[^'<]*')/gi, '');
    }
    }

    //; ignore whitespace
    htmlContent = htmlContent.replace(/\s+/g, ' ');

    return htmlContent;
      
  }
  
  function getAttrs(node){
      var ret=[];
      for(var i=0;i<node.attributes.length;i+=1){
           ret.push({name:node.attributes[i].name,value:node.attributes[i].value});
      }
      return ret;
  }

  function rip(node,preprocess,skipCSS) {
    var htmlContent, rippedData, compressed;
    
    htmlContent = mirror(node,preprocess,skipCSS);

    rippedData = {
      html: htmlContent,
      attrs:getAttrs(node),
      name:node.nodeName,
      css: {}
    };
    if(!skipCSS){
    //store CSS recursively
    makeRecursiveTraverser(function(e, id) {
      rippedData.css[id] = CSS.get(e);
    })(node, '', 1);
                
      rippedData.css = CSSompress.compress(rippedData.css);
    }

    var fragment = JSON.stringify(rippedData);
    //console.log(fragment);
    if (S.heuristic) {
      fragment = Heuristic.compress(fragment);
    }
    if (S.compressToArray){
      compressed = LZW.compressToArray(fragment);
    }else{
      compressed = LZW.compress(fragment, M.makeConverter(S.numberLength));
    }

    return compressed;

  }

  function extract(data){
    var obj;
    if (S.compressToArray){
      obj= LZW.decompressFromArray(data);
    }else{
      obj= LZW.decompress(data, M.reverseConverter, S.numberLength);
    }
            
    if (S.heuristic) {
      obj = Heuristic.decompress(obj);
    }
    obj = JSON.parse(obj);
    
    if(obj.css) {
      obj.css = CSSompress.decompress(obj.css);
    }
    
    return obj;
  }

  function put(data,target) {
    var node,findTR,
    obj = extract(data),
    nodeName = (obj.name)?obj.name:'div';
    
    
    if(target){
      node=target;
    }else{
    //if code starts from tr, it needs a table tag to work
    findTR = obj.html.substring(0,5);
    if(findTR.indexOf('<tr')>-1 || findTR.indexOf('<th')>-1 || findTR.indexOf('<td')>-1 ){
      nodeName = 'table';
    }
    node = document.createElement(nodeName);
    }
    node.innerHTML = obj.html;
    
    //add attributes to node
    if(obj.attrs){
      for(var i=0;i<obj.attrs.length;i+=1){
        node.setAttribute(obj.attrs[i].name,obj.attrs[i].value);
      } 
    }
    //console.log(obj);
    //set css back, recursively
    makeRecursiveTraverser(function(e, id) {
      var i,css = obj.css[id];
      for (var p in css) {
        i=CSS.camelize(p);
        e.style[i] = CSS.prefixify(css[p]);
        //console.log(p,i,css[p],CSS.prefixify(css[p]));
        if(i==='float'){
            e.style['cssFloat'] = css[p];
        }
      }
    })(node, '', 1);
    
    return node;

  }
  
  return {
    copy: rip,
    paste: put,
    tools: {
      extract:extract,
      M: M,
      Heuristic:Heuristic,
      makeRecursiveTraverser: makeRecursiveTraverser
    },
    testCompression: function(fragment) {
      var test = LZW.compress(fragment, M.makeConverter(S.numberLength));
      return [test, LZW.decompress(test, M.reverseConverter, S.numberLength)];
    }
  };

}

/*
init example:
var ripper=Ripper({
  dictionary: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!~*;:/$,"
});

*/
