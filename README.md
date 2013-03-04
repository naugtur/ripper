Ripper.js
======

Copy and compress fragments of html document and insert to another document preserving the CSS applied to elements.

The `copy(node)` method serializes all content of given DOM node and CSS style set on elements inside to a string containing only letters provided as the dictionary. The default dictionary contains all characters that are allowed in HTTP GET request.

The `paste(node,data)` method replace content of given node with deserialized content from the `data` string

##Usage:

    //without setup, default dictionary will be used
    var ripper=Ripper();

    //or with setup object
    var ripper=Ripper({dictionary:'abcdefghijklmnopqrstuvwxyz'});

    //copy a node
    var data=ripper.copy(DOMnode);
    //send data to the server

    //load data from the server on another page
    ripper.paste(whereToDOMnode,data);

##Avaliable options

 dictionary - characters avaliable for output, default = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!~*;:/$,-_"
 numberLength - length of a number in base{dictionary.length} encoding, default = 2
 heuristic - use heuristic compression before LZW, default = false
 keepJS - when set to false ripper removes all javascript from ripped content, default = false

You can also pass a preprocessing function as a second argument to `.copy()`, eg.

    ripper.copy(node,function(domCopy){
    	//modify domCopy before it gets serialized.
    	//original document is not affected
    	});

##Demo

http://naugtur.github.com/ripper/


