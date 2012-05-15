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
            if(typeof(n)!=='number'){return ''}
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
            if(typeof(n)!=='number'){return ''}
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

      var defaultsStore = {};

      function getStyleObject(dom) {
        var style, returns = {};
        if (window.getComputedStyle) {
          var camelize = function(a, b) {
              return b.toUpperCase();
            };
          style = window.getComputedStyle(dom, null);
          for (var i = 0, l = style.length; i < l; i += 1) {
            var prop = style[i],
              camel = prop.replace(/\-([a-z])/g, camelize),
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


      //memoized function to get the default style of an element
      //TODO prefetch styles for some form elements eg. putting OPTION in SELECT

      function memDefaults(tag, type) {
        var key = tag + type;
        if (defaultsStore[key]) {
          return defaultsStore[key];
        } else {
          //get styles for defaults
          var e = document.createElement(tag);
          type && (e.type = type);
          e.style.visibility = 'hidden';
          document.documentElement.appendChild(e);
          defaultsStore[key] = getStyleObject(e);
          defaultsStore[key].visibility = 'visible';
          document.documentElement.removeChild(e);
          return defaultsStore[key];
        }
      }

      //returns non-default styles for element
      // e is the element

      function getDiff(e) {
        var s = getStyleObject(e),
          nn = e.nodeName,
          d, r = false; //result not empty
        if (nn === 'INPUT') {
          d = memDefaults(nn, e.getAttribute('type'));
        } else {
          d = memDefaults(nn, '');
        }

        for (var i in d) {
          if (d.hasOwnProperty(i)) {
            if (s[i] === d[i]) {
              delete s[i];
            } else {
              //something remains
              r = true;
            }
          }
        }

        return (r) ? s : {};
      }


      return {
        get: getDiff
      }

    })();

    //------------------------------------------------------------------- /LZW
    var LZW = (function() {
      //setup for basic dictionary
      var rootDict=382;
      //good characters: ((n>31 && n<127)||n>=160) //maby later?
        
      
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
          if(c.charCodeAt(0)>rootDict){continue;}
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
              return;
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
        compress: function(txt, cV) {
          return compress(txt).map(function(a) {
            return cV(a)
          }).join('');
        },
        decompress: function(data, dV, chunkSize) {
          //split into chunks of characters
          var tmp = [];
          data = data.split('');
          while (data.length) {
            tmp[tmp.length] = dV(data.splice(0, chunkSize).join(''));
          }

          return decompress(tmp);
        }
      };

    })();

    //------------------------------------------------------------------- /Main
    //creates a function that runs a callback for every node, recursively, and provides identification

    function makeRecursiveTraverser(callback) {
      var action = callback,
        cV = M.makeConverter(S.numberLength);

      function recur(e, n, k, u) {
        var x, id = n + '' + cV(k);
        //doing stuff
        action(e, id);

        //go deeper
        k = 0;
        x = e.firstChild;
        for (; x; x = x.nextSibling) {
          if (x !== u && x.nodeType === 1) {
            recur(x, id, ++k);
          }
        }
      }
      return recur;
    }

    function rip(node) {
      var rippedData = {
        html: node.innerHTML.replace(/\s/g,' ').replace(/[ ]+/g,' '), //html-ignore whitespace
        css: {}
      };
      //store CSS recursively
      makeRecursiveTraverser(function(e, id) {
        rippedData.css[id] = CSS.get(e);
      })(node, '', 1);


      var fragment = JSON.stringify(rippedData);
      console.log(fragment);

      var compressed = LZW.compress(fragment, M.makeConverter(S.numberLength));
      console.log(compressed, compressed.length, fragment.length);

      return compressed;

    }

    function put(node, data) {
      var obj = LZW.decompress(data, M.reverseConverter, S.numberLength);
      obj = JSON.parse(obj);
      node.innerHTML = obj.html;
      //set css back, recursively
      makeRecursiveTraverser(function(e, id) {
        var css = obj.css[id];
        for (var i in css) {
          e.style[i] = css[i];
        }
      })(node, '', 1);
    }

    return {
      copy: rip,
      paste: put,
      test:function(fragment){
        var test=LZW.compress(fragment, M.makeConverter(S.numberLength));
        return [test,LZW.decompress(test, M.reverseConverter, S.numberLength)];
      }
    };

  }

/*
init example:
var ripper=Ripper({
  dictionary: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!~*;:/$,"
});

*/
