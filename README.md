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

MAYBE:

* Commit values to outside variables at the end of an update?
