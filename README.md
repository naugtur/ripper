Ripper.js
======

Copy and compress fragments of html document and insert to another document preserving the CSS applied to elements.

The `copy(node,<preprocess>,<skipCSS>)` method serializes all content of given DOM node and CSS style set on elements inside to a string containing only letters provided as the dictionary. The default dictionary contains all characters that are allowed in HTTP GET request. Optional attributes: perprocess - function to run on node copy before serializing; skipCSS - set to true to not sotre information about styles.

The `paste(data,<target>)` method returns a node with deserialized content from the `data` string. Optional: target - node to use for output.

##Usage:

    //without setup, default dictionary will be used
    var ripper=Ripper();

    //or with setup object
    var ripper=Ripper({dictionary:'abcdefghijklmnopqrstuvwxyz'});

    //copy a node
    var data=ripper.copy(DOMnode);
    //send data to the server

    //load data from the server on another page
    ripper.paste(data,domNode);
    //domNode is optional. ripper.paste will work on a newly created node if domNode is not given. It is recommended to work on a node that is not in the visible document.

##Avaliable options

  - dictionary - characters avaliable for output, default = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!~*;:/$,-_"
  - numberLength - length of a number in base{dictionary.length} encoding, default = 2
  - heuristic - use heuristic compression before LZW, default = false
  - keepJS - when set to false ripper removes all javascript from ripped content, default = false

You can also pass a preprocessing function as a second argument to `.copy()`, eg.

    ripper.copy(node,function(domCopy){
    	//modify domCopy before it gets serialized.
    	//original document is not affected
    	},skipCSS);

skipCSS - if true, css is not mirrored (it actually copies just the HTML and compresses it then). Useful when grabbing whole document.



##Demo

http://naugtur.github.com/ripper/


