const Mainloop = imports.mainloop;

let df = dataflow {
  a <- @timer(1000)
  b <- a + 44
  c <- b * a
  _ <- log(a)
};

df.start();

Mainloop.run('main');
