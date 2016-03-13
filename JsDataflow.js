const Gdk = imports.gi.Gdk;
const Gtk = imports.gi.Gtk;
const Mainloop = imports.mainloop;
const Utils = imports.Utils;

const DataflowRuntime = imports.JsDataflowRuntime;

if (ARGV.length < 1)
  throw new Error('Need at least one argument');

Gtk.init(null, null);

let win = new Gtk.Window
win.resize(800, 600);
win.show();

let toDataflow = function(text) {
  return new DataflowRuntime.Dataflow({ input: text,
                                        debug: false,
                                        eval: function(code) { return eval(code); }
                                      });
};

let text = Utils.loadFile(ARGV[0]);
let flow = toDataflow(text);
flow.start();

Mainloop.timeout_add(2000, function() {
  log(JSON.stringify(flow.getValues()));
  //flow.stop();
  //Mainloop.quit('main');
  return false;
});
//Mainloop.run('main');
Gtk.main();
