js-dataflow: An experiment with some kind of dataflow language

Very much inspired by the [Flapjax language](http://flapjax-lang.org/)

TODO:
* Embed within Javascript, maybe with something like :
```javascript
          var d = dataflow {
              t <- @timer(20)
          };
          d.start();
```
* A live editor, reparsing the dataflow, stopping the old one, save its
  values, load them into the new one and restart.
* JS objects as values
* Expression within strings (Ruby style, also ES6/7 might have this too)

MAYBE:

* Commit values to outside variables at the end of an update?
