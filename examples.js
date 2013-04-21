//examples of ripper usage

var ripper=Ripper({
  dictionary: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!~*;:/$,"
  numberLength: 3,
  heuristic:true
});

//__________________________________________________________________
//simply copy the first form found in the document
var payload = ripper.copy(document.querySelectorAll('form')[0]);

//__________________________________________________________________
//copy node with simple preprocessing
//clear out all iframe src affributes in the document
var preprocess = function(domtree) { //domtree is a clone of the dom fragment that is being ripped
	var iframes = domtree.getElementsByTagName('iframe');
	var i=iframes.length;
	while(i--){
		iframes[i].removeAttribute('src');
	}
	return domtree;
};
var payload = ripper.copy(document.querySelectorAll('form')[0],preprocess);

//__________________________________________________________________
//copy and compress HTML only, without CSS
//2nd argument is the preprocess function, none this time
//3rd argument is 'skipCSS' = true
//the payload will not contain information about computed styles, but style="" attributes will stay
var payload = ripper.copy(document.documentElement,null,true);


//__________________________________________________________________
//copy the whole document
//to paste it in a page with a different address it'd be nice to change all addresses to absolute
//this preprocess function does just that
var preprocess = function(domtree) { //domtree is a clone of the dom fragment that is being ripped
	var interestingNodes = { //nodes worth checking for links
		'LINK': 'href',
		'IMG': 'src',
		'AREA': 'href',
		'IMAGE': 'src',
		'A': 'href'
	};
	//this is a tool that runs the given function on every node in a tree. 
	//e is the current node
	//id is a uniquie identifier of an element order in the tree. 
	//If you run another traverser on that same dom strucutre, the id will be the same
	//n - element e is n-th child of its parent (starting with 1). First run is for the initial node, so n has a value that you pass yourself (0 in this case) 
	var traverser = ripper.tools.makeRecursiveTraverser(function(e, id, n) {
		if (interestingNodes[e.nodeName]) {
			if (e.hasAttribute(interestingNodes[e.nodeName])) {
				//implementing absolutizeURI is left as an exercise for the reader
				e.setAttribute(interestingNodes[e.nodeName], absolutizeURI(e.getAttribute(interestingNodes[e.nodeName])));
			}
		}
	});
	// traverser(dom element, id for root node, n value for root node
	traverser(domtree, 'R', 0);
	return domtree;//don't forget to return results
}

//3rd argument set to true to skip ripping the computed styles, because all style declarations will be in the ripped content
var payload = ripper.copy(document.documentElement,preprocess,true);

