describe("ripper", function() {


    it('should rip content and save it correctly with given dictionary', function() {


        var ripper=Ripper({
          dictionary: "abcdefghijklmnopqrstuvwxyz",
          numberLength: 3,
          heuristic:true
        });
        var cp = ripper.copy(document.getElementById('test'));

        expect((/^[a-z]+$/).test(cp)).toBe(true);

    });

    it('should apply heuristic compression to some words', function() {


        var ripper=Ripper(),
        text='<div align color Arial ...';

        expect(ripper.tools.Heuristic.compress(text)).not.toBe(text);

    });

    it('should return different results if heuristic is on', function() {


        var node=document.getElementById('test'),
        ripper=Ripper({
          dictionary: "abcdefghijklmnopqrstuvwxyz",
          numberLength: 3,
          heuristic:true
        }),
        ripper2=Ripper({
          dictionary: "abcdefghijklmnopqrstuvwxyz",
          numberLength: 3,
          heuristic:false
        });
        var cp1 = ripper.copy(node);
        var cp2 = ripper2.copy(node);

        expect(cp1 != cp2).toBe(true);
        expect(cp1.length < cp2.length).toBe(true);

    });


    it('should call preprocess function with DOM element as argument', function() {

        var arg,ripper=Ripper({
          dictionary: "abcdefghijklmnopqrstuvwxyz",
          numberLength: 3,
          heuristic:true
      });
        var cp = ripper.copy(document.getElementById('test'),function(){
            arg=arguments;
        });

        expect(arg.length).toEqual(1);
        expect(arg[0].nodeName).toBe('DIV');

    });

    it('should output different things when preprocess removes content', function() {

        var ripper=Ripper({
          dictionary: "abcdefghijklmnopqrstuvwxyz",
          numberLength: 3,
          heuristic:true
      });
        var cp1 = ripper.copy(document.getElementById('test'));
        var cp2 = ripper.copy(document.getElementById('test'),function(dom){
            dom.getElementsByTagName('q')[0].innerHTML='zzzzzzz';
        });

        expect(cp1).not.toEqual(cp2);

    });

    it('should pass a copy of dom node to preprocess function', function() {

        var ripper=Ripper({
          dictionary: "abcdefghijklmnopqrstuvwxyz",
          numberLength: 3,
          heuristic:true
      });
        var copynode,node=document.getElementById('test');
        ripper.copy(node,function(dom){
            copynode = dom;
        });

        expect(copynode == node);
        expect(copynode !== node);

        copynode.innerHTML = '';
        expect(node.getElementsByTagName('q').length>0).toBe(true);
    });

    it('should remove scripts and inline style declarations', function() {

        var ripper=Ripper({
          dictionary: "abcdefghijklmnopqrstuvwxyz",
          numberLength: 3,
          heuristic:true
      });
        
        var res = ripper.tools.extract(ripper.copy(document.getElementById('test')));

        expect((/color.red/).test(res.html)).toBe(false);
        expect((/alert/).test(res.html)).toBe(false);
        expect((/--scripts--/).test(res.html)).toBe(false);

    });

    it('should keep scripts when told to', function() {

        var ripper=Ripper({
          dictionary: "abcdefghijklmnopqrstuvwxyz",
          numberLength: 3,
          heuristic:true,
          keepJS:true
      });
        

        var res = ripper.tools.extract(ripper.copy(document.getElementById('test')));

        expect((/color.red/).test(res.html)).toBe(false);
        expect((/alert/).test(res.html)).toBe(true);
        expect((/--scripts--/).test(res.html)).toBe(true);

    });

    it('should skip copying computedStyle when told to (and not remove styles from html)', function() {

        var ripper=Ripper({
          dictionary: "abcdefghijklmnopqrstuvwxyz",
          numberLength: 3,
          heuristic:true
      });
        

        var res = ripper.tools.extract(ripper.copy(document.getElementById('test'),null,true));
        
        expect(JSON.stringify(res.css)).toBe('{}');
        expect((/color:red/).test(res.html)).toBe(true);
    });

    it('should keep scripts and skip css together too', function() {

        var ripper=Ripper({
          dictionary: "abcdefghijklmnopqrstuvwxyz",
          numberLength: 3,
          heuristic:true,
          keepJS:true
      });

        var res = ripper.tools.extract(ripper.copy(document.getElementById('test'),null,true));
        
        expect(JSON.stringify(res.css)).toBe('{}');
        expect((/color:red/).test(res.html)).toBe(true);
        expect((/alert/).test(res.html)).toBe(true);
        expect((/--scripts--/).test(res.html)).toBe(true);

    });

    it('should not destroy attributes that have "on" in them when removing event handlers from html', function() {

        var ripper=Ripper({
          dictionary: "abcdefghijklmnopqrstuvwxyz",
          numberLength: 3,
          heuristic:true
      });

        var res = ripper.tools.extract(ripper.copy(document.head));
        expect((/X-UA-Compatible" content/).test(res.html)).toBe(true);

    });

    it('should deal with too big data properly', function() {

        var error=false,ripper=Ripper({
          dictionary: "01",
          numberLength: 2
          });
        try{
             ripper.copy(document.getElementById('test'));
        }catch(e){
            error=true;
        }   
        expect(error).toBe(true);

    });

    //it should translate float<=>cssFloat

    //it should translate prefixes to -rr-

//---------------------------------------------

    it('should be able to return content from .paste', function() {

        var ripper=Ripper({
          dictionary: "abcdefghijklmnopqrstuvwxyz",
          numberLength: 3,
          heuristic:true
      });

        var node = ripper.paste(ripper.copy(document.getElementById('test')));
        expect(node.getElementsByTagName('q').length>0).toBe(true);

    });

    it('should be able to paste content to given node', function() {

        var ripper=Ripper({
          dictionary: "abcdefghijklmnopqrstuvwxyz",
          numberLength: 3,
          heuristic:true
      });

        var res = document.getElementById('res');
        ripper.paste(ripper.copy(document.getElementById('test')),res);
        expect(res.getElementsByTagName('q').length>0).toBe(true);

    });

    it('should throw custom errors on stupid data', function() {

        var error=false,ripper=Ripper({
          dictionary: "abcdefghijklmnopqrstuvwxyz",
          numberLength: 3,
          heuristic:true
      });

        try{
           ripper.tools.extract('abcdefghijklmnopqrstuvwxyz');
        }catch(e){
            console.log(e);
            error=true;
        }   
        expect(error).toBe(true);

        error=false;
        try{
           ripper.tools.extract('123');
        }catch(e){
            console.log(e);
            error=true;
        }   
        expect(error).toBe(true);
        
        error=false;
        try{
           ripper.tools.extract('#$^%');
        }catch(e){
            console.log(e);
            error=true;
        }   
        expect(error).toBe(true);
        
        

    });


    it('should preserve all styles in pasted nodes', function() {

        var ripper=Ripper({
          dictionary: "abcdefghijklmnopqrstuvwxyz",
          numberLength: 3,
          heuristic:true
      });

        var res = ripper.paste(ripper.copy(document.getElementById('test')));


        expect(res.getElementsByTagName('q')[0].style.lineHeight == '13px').toBe(true);
        expect(res.getElementsByTagName('a')[0].style.lineHeight == '14px').toBe(true);

    });

    //it should replace -rr- with correct prefixes when pasting

    //it should wrap content in table instead of div when content starts with tr tag

});





            // runs(function() {
            //     insertionQ('blockquote').every(callback);
            // });
            // waits(200);
            // runs(function() {
            //     document.body.appendChild(document.createElement('blockquote'));
            // });
            // waits(200); //just to be sure
            // runs(function() {
            //     expect(callback.calls.length).toEqual(1);
            // });