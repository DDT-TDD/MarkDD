# GraphViz Test - Simple

This is a test to verify that GraphViz is working properly with the new v3.x standalone implementation.

## Simple Graph

```graphviz
digraph G {
  A -> B;
  B -> C;
  C -> A;
}
```

## Network Diagram

```graphviz
graph network {
  node [shape=circle];
  Router -- Switch1;
  Router -- Switch2;
  Switch1 -- PC1;
  Switch1 -- PC2;
  Switch2 -- Server1;
  Switch2 -- Server2;
}
```

## Flowchart

```dot
digraph flowchart {
  rankdir=TB;
  node [shape=box];
  
  Start [label="Start"];
  Decision [shape=diamond, label="Decision"];
  Process1 [label="Process 1"];
  Process2 [label="Process 2"];
  End [label="End"];
  
  Start -> Decision;
  Decision -> Process1 [label="Yes"];
  Decision -> Process2 [label="No"];
  Process1 -> End;
  Process2 -> End;
}
```

If you can see properly rendered diagrams above, GraphViz is working correctly!