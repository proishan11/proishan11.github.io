---
title: "Graph Algorithms: Mathematics & Implementation"
subtitle: "A deep dive into graph theory, from formal definitions to working Python code."
date: 2025-12-31
author: "Ishan"
math: true
draft: false
---

Graphs are one of the most versatile data structures in computer science. They model everything from social networks to routing protocols to dependency resolution. In this post, we'll build up graph theory from first principles — formal definitions, mathematical analysis, and clean Python implementations for each algorithm. {{< sidenote >}}This post assumes familiarity with basic data structures (arrays, hash maps, heaps) and Big-O notation.{{< /sidenote >}}

## Foundations

### Formal Definition

A **graph** $G$ is an ordered pair $G = (V, E)$ where:

- $V$ is a set of **vertices** (or nodes)
- $E \subseteq V \times V$ is a set of **edges**

If the edges are ordered pairs, the graph is **directed** (digraph). If unordered, it's **undirected**.

The **degree** of a vertex $v$ in an undirected graph is the number of edges incident to it:

$$\deg(v) = |\{e \in E : v \in e\}|$$

The **Handshaking Lemma** gives us a fundamental invariant:

$$\sum_{v \in V} \deg(v) = 2|E|$$

This follows directly from the fact that each edge contributes exactly 2 to the total degree count.

For directed graphs, we distinguish between **in-degree** and **out-degree**:

$$\deg^{-}(v) = |\{(u, v) \in E\}|, \quad \deg^{+}(v) = |\{(v, u) \in E\}|$$

### Graph Representations

There are two standard ways to represent a graph in memory.

**Adjacency Matrix**: A 2D matrix $A$ of size $|V| \times |V|$ where $A[i][j] = 1$ if edge $(i, j) \in E$.

- Space: $O(V^2)$
- Edge lookup: $O(1)$
- Iterate neighbors: $O(V)$

**Adjacency List**: An array of lists where each vertex stores its neighbors.

- Space: $O(V + E)$
- Edge lookup: $O(\deg(v))$
- Iterate neighbors: $O(\deg(v))$

For sparse graphs ($|E| \ll |V|^2$), adjacency lists are almost always the right choice. Here's the implementation we'll use throughout:

```python
from collections import defaultdict, deque
import heapq

class Graph:
    def __init__(self, directed=False):
        self.adj = defaultdict(list)
        self.directed = directed

    def add_edge(self, u, v, weight=1):
        self.adj[u].append((v, weight))
        if not self.directed:
            self.adj[v].append((u, weight))

    @property
    def vertices(self):
        verts = set(self.adj.keys())
        for neighbors in self.adj.values():
            for v, _ in neighbors:
                verts.add(v)
        return verts
```

## Traversal Algorithms

### Breadth-First Search (BFS)

BFS explores a graph layer by layer, visiting all vertices at distance $k$ before any vertex at distance $k+1$.

**Key property**: BFS finds the shortest path (by number of edges) from the source to every reachable vertex.

**Theorem**: *For an unweighted graph $G = (V, E)$ and source vertex $s$, BFS computes $\delta(s, v)$ — the shortest-path distance — for every $v \in V$.*

*Proof sketch*: BFS maintains a queue. When vertex $v$ is discovered from vertex $u$, we set $d[v] = d[u] + 1$. Since vertices are processed in FIFO order and each vertex is enqueued at most once, $d[v] = \delta(s, v)$. The formal proof uses induction on the number of ENQUEUE operations and the monotonicity of distances in the queue.

**Time complexity**: $O(V + E)$ — every vertex is enqueued and dequeued at most once, and every edge is examined at most once (twice for undirected).

**Space complexity**: $O(V)$ for the visited set and queue.

```python
def bfs(graph, source):
    """
    Returns (dist, parent) dictionaries.
    dist[v] = shortest distance from source to v (by edge count).
    parent[v] = predecessor of v on the shortest path.
    """
    dist = {source: 0}
    parent = {source: None}
    queue = deque([source])

    while queue:
        u = queue.popleft()
        for v, _ in graph.adj[u]:
            if v not in dist:
                dist[v] = dist[u] + 1
                parent[v] = u
                queue.append(v)

    return dist, parent


def reconstruct_path(parent, target):
    """Trace back from target to source using parent pointers."""
    path = []
    current = target
    while current is not None:
        path.append(current)
        current = parent[current]
    return path[::-1]
```

**Example usage:**

```python
g = Graph()
for u, v in [(0,1), (0,2), (1,3), (2,3), (3,4), (4,5)]:
    g.add_edge(u, v)

dist, parent = bfs(g, 0)
print(dist)    # {0: 0, 1: 1, 2: 1, 3: 2, 4: 3, 5: 4}
print(reconstruct_path(parent, 5))  # [0, 1, 3, 4, 5]
```

### Depth-First Search (DFS)

DFS explores as deep as possible along each branch before backtracking. It's the backbone of many graph algorithms.

DFS assigns **discovery** and **finish** times to each vertex, which encode the structure of the search:

$$d[v] < d[w] < f[w] < f[v] \implies w \text{ is a descendant of } v$$

This is the **Parenthesis Theorem**: the discovery/finish intervals for any two vertices are either entirely disjoint or one is contained within the other.

**Edge Classification**: DFS classifies every edge in the graph:

- **Tree edge**: leads to an undiscovered vertex
- **Back edge**: leads to an ancestor in the DFS tree (indicates a **cycle**)
- **Forward edge**: leads to a descendant (directed graphs only)
- **Cross edge**: everything else (directed graphs only)

**Theorem**: *A directed graph has a cycle if and only if DFS discovers a back edge.*

**Time complexity**: $O(V + E)$

```python
def dfs(graph):
    """
    Full DFS over the graph.
    Returns (discovery, finish, parent, order) where order is
    the list of vertices in finish-time order (useful for topological sort).
    """
    discovery = {}
    finish = {}
    parent = {}
    order = []
    time = [0]  # mutable counter

    def visit(u):
        time[0] += 1
        discovery[u] = time[0]

        for v, _ in graph.adj[u]:
            if v not in discovery:
                parent[v] = u
                visit(v)

        time[0] += 1
        finish[u] = time[0]
        order.append(u)

    for v in graph.vertices:
        if v not in discovery:
            parent[v] = None
            visit(v)

    return discovery, finish, parent, order


def has_cycle(graph):
    """Detect if a directed graph has a cycle using DFS coloring."""
    WHITE, GRAY, BLACK = 0, 1, 2
    color = {v: WHITE for v in graph.vertices}

    def visit(u):
        color[u] = GRAY
        for v, _ in graph.adj[u]:
            if color[v] == GRAY:
                return True  # back edge → cycle
            if color[v] == WHITE and visit(v):
                return True
        color[u] = BLACK
        return False

    return any(color[v] == WHITE and visit(v) for v in graph.vertices)
```

### Connected Components

For undirected graphs, BFS or DFS can identify **connected components** — maximal sets of vertices where every pair is connected by a path.

The number of connected components $k$ relates to the Euler characteristic:

$$\chi(G) = |V| - |E| + F$$

For a forest (acyclic graph), the number of connected components is:

$$k = |V| - |E|$$

```python
def connected_components(graph):
    """Returns a list of components, each a set of vertices."""
    visited = set()
    components = []

    for v in graph.vertices:
        if v not in visited:
            component = set()
            queue = deque([v])
            while queue:
                u = queue.popleft()
                if u in visited:
                    continue
                visited.add(u)
                component.add(u)
                for w, _ in graph.adj[u]:
                    if w not in visited:
                        queue.append(w)
            components.append(component)

    return components
```

## Shortest Path Algorithms

### Dijkstra's Algorithm

Dijkstra's finds the shortest path from a single source in a graph with **non-negative** edge weights. {{< sidenote >}}Dijkstra's fails with negative weights because it assumes the greedy choice is final — once a vertex is "settled," its distance won't improve. A negative edge can violate this.{{< /sidenote >}}

**Invariant**: When a vertex $u$ is extracted from the priority queue, $d[u] = \delta(s, u)$ — the true shortest-path distance.

**Correctness proof**: By contradiction. Suppose vertex $u$ is the first vertex extracted with $d[u] > \delta(s, u)$. Let $p$ be the true shortest path $s \leadsto u$, and let $(x, y)$ be the first edge on $p$ that crosses from settled to unsettled vertices. Then:

$$d[y] \leq d[x] + w(x, y) = \delta(s, x) + w(x, y) = \delta(s, y) \leq \delta(s, u) < d[u]$$

But then $y$ would have been extracted before $u$, contradicting our assumption. ∎

**Time complexity**: With a binary heap, $O((V + E) \log V)$. With a Fibonacci heap, $O(V \log V + E)$.

```python
def dijkstra(graph, source):
    """
    Dijkstra's shortest path algorithm.
    Returns (dist, parent) where dist[v] is the shortest distance
    from source to v, and parent[v] is the predecessor on that path.
    Requires all edge weights >= 0.
    """
    dist = {v: float('inf') for v in graph.vertices}
    parent = {v: None for v in graph.vertices}
    dist[source] = 0

    # Min-heap: (distance, vertex)
    heap = [(0, source)]

    while heap:
        d_u, u = heapq.heappop(heap)

        # Skip stale entries
        if d_u > dist[u]:
            continue

        for v, weight in graph.adj[u]:
            new_dist = dist[u] + weight
            if new_dist < dist[v]:
                dist[v] = new_dist
                parent[v] = u
                heapq.heappush(heap, (new_dist, v))

    return dist, parent
```

**Example:**

```python
g = Graph(directed=True)
g.add_edge('A', 'B', 4)
g.add_edge('A', 'C', 2)
g.add_edge('C', 'B', 1)
g.add_edge('B', 'D', 5)
g.add_edge('C', 'D', 8)
g.add_edge('C', 'E', 10)
g.add_edge('D', 'E', 2)

dist, parent = dijkstra(g, 'A')
print(dist)
# {'A': 0, 'B': 3, 'C': 2, 'D': 8, 'E': 10}
print(reconstruct_path(parent, 'E'))
# ['A', 'C', 'B', 'D', 'E']
```

### Bellman-Ford Algorithm

Bellman-Ford handles graphs with **negative edge weights** and can detect **negative-weight cycles**.

The algorithm performs $|V| - 1$ relaxation passes over all edges. This works because any shortest path has at most $|V| - 1$ edges (otherwise it contains a cycle).

**Relaxation**: For edge $(u, v)$ with weight $w$:

$$\text{if } d[v] > d[u] + w(u, v): \quad d[v] \leftarrow d[u] + w(u, v)$$

**Theorem**: *After $i$ iterations, Bellman-Ford correctly computes shortest paths using at most $i$ edges.*

*Proof*: By induction. After 0 iterations, $d[s] = 0$ is correct (path of 0 edges). If after $i$ iterations the claim holds, then iteration $i+1$ relaxes all edges, so for any shortest path using $i+1$ edges $s \leadsto u \to v$, we have $d[u] = \delta_i(s, u)$ and the relaxation of $(u, v)$ gives $d[v] = \delta_{i+1}(s, v)$. ∎

**Negative cycle detection**: If any edge can still be relaxed after $|V| - 1$ passes, a negative-weight cycle exists.

**Time complexity**: $O(VE)$

```python
def bellman_ford(graph, source):
    """
    Bellman-Ford shortest path algorithm.
    Handles negative edge weights.
    Returns (dist, parent, has_negative_cycle).
    """
    dist = {v: float('inf') for v in graph.vertices}
    parent = {v: None for v in graph.vertices}
    dist[source] = 0

    vertices = list(graph.vertices)
    edges = []
    for u in graph.adj:
        for v, w in graph.adj[u]:
            edges.append((u, v, w))

    # Relax all edges |V| - 1 times
    for _ in range(len(vertices) - 1):
        for u, v, w in edges:
            if dist[u] != float('inf') and dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                parent[v] = u

    # Check for negative-weight cycles
    has_negative_cycle = False
    for u, v, w in edges:
        if dist[u] != float('inf') and dist[u] + w < dist[v]:
            has_negative_cycle = True
            break

    return dist, parent, has_negative_cycle
```

### Dijkstra vs Bellman-Ford

| Property | Dijkstra | Bellman-Ford |
|---|---|---|
| Negative weights | No | Yes |
| Negative cycle detection | No | Yes |
| Time complexity | $O((V+E) \log V)$ | $O(VE)$ |
| Strategy | Greedy | Dynamic programming |

## Minimum Spanning Trees

A **minimum spanning tree** (MST) of a connected, weighted, undirected graph is a subset of edges $T \subseteq E$ such that:

1. $T$ connects all vertices (spanning)
2. $T$ has no cycles (tree)
3. $\sum_{e \in T} w(e)$ is minimized

An MST always has exactly $|V| - 1$ edges.

### Cut Property

The **cut property** is the theoretical foundation for both Kruskal's and Prim's algorithms.

**Theorem** (Cut Property): *For any cut $(S, V \setminus S)$ of $G$, the minimum-weight edge crossing the cut is in some MST of $G$.* {{< sidenote >}}A **cut** is a partition of vertices into two non-empty sets. An edge **crosses** the cut if its endpoints are in different sets.{{< /sidenote >}}

*Proof*: Let $e = (u, v)$ be the minimum-weight edge crossing $(S, V \setminus S)$. Suppose $T$ is an MST that doesn't contain $e$. Then $T$ must contain some other edge $e'$ crossing the cut (since $T$ is spanning). Adding $e$ to $T$ creates a cycle containing both $e$ and $e'$. Removing $e'$ gives $T' = T \cup \{e\} \setminus \{e'\}$, which is still a spanning tree with $w(T') \leq w(T)$. So $T'$ is also an MST containing $e$. ∎

### Kruskal's Algorithm

Kruskal's builds the MST by greedily adding the cheapest edge that doesn't create a cycle. It uses a **Union-Find** (Disjoint Set Union) data structure.

**Union-Find** supports two operations:

- `find(x)`: return the representative of $x$'s set
- `union(x, y)`: merge the sets containing $x$ and $y$

With **path compression** and **union by rank**, both operations run in amortized $O(\alpha(n))$ time, where $\alpha$ is the inverse Ackermann function — effectively constant.

**Time complexity**: $O(E \log E)$ (dominated by sorting edges)

```python
class UnionFind:
    def __init__(self):
        self.parent = {}
        self.rank = {}

    def make_set(self, x):
        self.parent[x] = x
        self.rank[x] = 0

    def find(self, x):
        if self.parent[x] != x:
            self.parent[x] = self.find(self.parent[x])  # path compression
        return self.parent[x]

    def union(self, x, y):
        rx, ry = self.find(x), self.find(y)
        if rx == ry:
            return False

        # union by rank
        if self.rank[rx] < self.rank[ry]:
            rx, ry = ry, rx
        self.parent[ry] = rx
        if self.rank[rx] == self.rank[ry]:
            self.rank[rx] += 1
        return True


def kruskal(graph):
    """
    Kruskal's MST algorithm.
    Returns (mst_edges, total_weight).
    """
    edges = []
    seen = set()
    for u in graph.adj:
        for v, w in graph.adj[u]:
            edge = (w, min(u, v), max(u, v))
            if edge not in seen:
                seen.add(edge)
                edges.append(edge)

    edges.sort()  # sort by weight

    uf = UnionFind()
    for v in graph.vertices:
        uf.make_set(v)

    mst = []
    total = 0

    for w, u, v in edges:
        if uf.union(u, v):
            mst.append((u, v, w))
            total += w
            if len(mst) == len(graph.vertices) - 1:
                break

    return mst, total
```

### Prim's Algorithm

Prim's grows the MST from a starting vertex by always adding the cheapest edge connecting the tree to a non-tree vertex. It's essentially Dijkstra's algorithm with edge weights instead of path distances.

**Time complexity**: $O((V + E) \log V)$ with a binary heap.

```python
def prim(graph, start=None):
    """
    Prim's MST algorithm.
    Returns (mst_edges, total_weight).
    """
    if start is None:
        start = next(iter(graph.vertices))

    in_mst = set()
    mst = []
    total = 0

    # Min-heap: (weight, vertex, parent)
    heap = [(0, start, None)]

    while heap and len(in_mst) < len(graph.vertices):
        w, u, p = heapq.heappop(heap)

        if u in in_mst:
            continue

        in_mst.add(u)
        if p is not None:
            mst.append((p, u, w))
            total += w

        for v, weight in graph.adj[u]:
            if v not in in_mst:
                heapq.heappush(heap, (weight, v, u))

    return mst, total
```

**Example:**

```python
g = Graph()
g.add_edge('A', 'B', 4)
g.add_edge('A', 'C', 1)
g.add_edge('B', 'C', 2)
g.add_edge('B', 'D', 5)
g.add_edge('C', 'D', 8)
g.add_edge('C', 'E', 10)
g.add_edge('D', 'E', 2)

print(kruskal(g))
# ([('A', 'C', 1), ('B', 'C', 2), ('D', 'E', 2), ('A', 'B', 4)], 9)

print(prim(g, 'A'))
# ([('A', 'C', 1), ('C', 'B', 2), ('B', 'D', 5), ('D', 'E', 2)], 10)
```

## Topological Sort

A **topological ordering** of a directed acyclic graph (DAG) is a linear ordering of vertices such that for every edge $(u, v)$, $u$ appears before $v$.

**Theorem**: *A directed graph admits a topological ordering if and only if it is a DAG.*

*Proof ($\Rightarrow$)*: If there's a cycle $v_1 \to v_2 \to \cdots \to v_k \to v_1$, then a topological order requires $v_1$ before $v_2$, $v_2$ before $v_3$, ..., and $v_k$ before $v_1$, which means $v_1$ before $v_1$ — a contradiction.

*Proof ($\Leftarrow$)*: The DFS-based algorithm below constructs the ordering.

### DFS-Based Topological Sort

Reverse the DFS finish order. Vertices that finish later in DFS have no remaining dependencies, so they go first.

**Time complexity**: $O(V + E)$

```python
def topological_sort_dfs(graph):
    """Topological sort using DFS. Returns list in topological order."""
    _, _, _, order = dfs(graph)
    return order[::-1]
```

### Kahn's Algorithm (BFS-Based)

An alternative approach using in-degree counting. This is often preferred because it naturally detects cycles.

```python
def topological_sort_kahn(graph):
    """
    Kahn's algorithm for topological sort.
    Returns (order, is_dag) where is_dag is False if a cycle exists.
    """
    in_degree = {v: 0 for v in graph.vertices}
    for u in graph.adj:
        for v, _ in graph.adj[u]:
            in_degree[v] = in_degree.get(v, 0) + 1

    # Start with vertices that have no incoming edges
    queue = deque([v for v in in_degree if in_degree[v] == 0])
    order = []

    while queue:
        u = queue.popleft()
        order.append(u)

        for v, _ in graph.adj[u]:
            in_degree[v] -= 1
            if in_degree[v] == 0:
                queue.append(v)

    is_dag = len(order) == len(graph.vertices)
    return order, is_dag
```

**Application — build systems**: Topological sort determines the order to compile modules with dependencies. If the dependency graph has a cycle, compilation is impossible.

```python
build = Graph(directed=True)
build.add_edge('main.c', 'utils.o')
build.add_edge('main.c', 'graph.o')
build.add_edge('graph.o', 'utils.o')
build.add_edge('utils.o', 'stdlib')

order, is_dag = topological_sort_kahn(build)
print(order)
# ['stdlib', 'utils.o', 'graph.o', 'main.c']
```

## Strongly Connected Components

In a directed graph, a **strongly connected component** (SCC) is a maximal set of vertices where every vertex is reachable from every other vertex.

### Kosaraju's Algorithm

Kosaraju's uses two passes of DFS:

1. Run DFS on $G$, recording finish times
2. Run DFS on $G^T$ (transposed graph) in reverse finish-time order

Each DFS tree in pass 2 is an SCC. {{< sidenote >}}The transpose $G^T$ is obtained by reversing every edge. If $(u, v) \in E$, then $(v, u) \in E^T$.{{< /sidenote >}}

**Why it works**: The first DFS orders vertices by finish time. In $G^T$, starting from a vertex with the latest finish time limits the search to vertices that could reach it in $G$ — exactly the SCC.

**Time complexity**: $O(V + E)$

```python
def kosaraju(graph):
    """
    Kosaraju's algorithm for finding strongly connected components.
    Returns a list of SCCs, each a set of vertices.
    """
    # Pass 1: DFS on original graph, record finish order
    _, _, _, order = dfs(graph)

    # Build transposed graph
    g_t = Graph(directed=True)
    for u in graph.adj:
        for v, w in graph.adj[u]:
            g_t.add_edge(v, u, w)

    # Pass 2: DFS on transposed graph in reverse finish order
    visited = set()
    sccs = []

    def dfs_collect(start):
        component = set()
        stack = [start]
        while stack:
            u = stack.pop()
            if u in visited:
                continue
            visited.add(u)
            component.add(u)
            for v, _ in g_t.adj[u]:
                if v not in visited:
                    stack.append(v)
        return component

    for v in reversed(order):
        if v not in visited:
            sccs.append(dfs_collect(v))

    return sccs
```

## Floyd-Warshall: All-Pairs Shortest Paths

When you need shortest paths between **all** pairs of vertices, Floyd-Warshall uses dynamic programming.

Let $d_k[i][j]$ be the shortest path from $i$ to $j$ using only vertices $\{1, 2, \ldots, k\}$ as intermediaries. The recurrence is:

$$d_k[i][j] = \min(d_{k-1}[i][j], \; d_{k-1}[i][k] + d_{k-1}[k][j])$$

**Base case**: $d_0[i][j] = w(i, j)$ if $(i, j) \in E$, else $\infty$ (and $d_0[i][i] = 0$).

**Time complexity**: $O(V^3)$
**Space complexity**: $O(V^2)$ (can be done in-place)

```python
def floyd_warshall(graph):
    """
    Floyd-Warshall all-pairs shortest paths.
    Returns a 2D dict: dist[u][v] = shortest distance from u to v.
    """
    vertices = list(graph.vertices)
    n = len(vertices)
    idx = {v: i for i, v in enumerate(vertices)}

    INF = float('inf')
    dist = [[INF] * n for _ in range(n)]
    nxt = [[None] * n for _ in range(n)]

    # Initialize
    for i in range(n):
        dist[i][i] = 0
        nxt[i][i] = i

    for u in graph.adj:
        for v, w in graph.adj[u]:
            i, j = idx[u], idx[v]
            dist[i][j] = w
            nxt[i][j] = j

    # DP
    for k in range(n):
        for i in range(n):
            for j in range(n):
                if dist[i][k] + dist[k][j] < dist[i][j]:
                    dist[i][j] = dist[i][k] + dist[k][j]
                    nxt[i][j] = nxt[i][k]

    # Convert back to vertex labels
    result = {}
    for u in vertices:
        result[u] = {}
        for v in vertices:
            result[u][v] = dist[idx[u]][idx[v]]

    return result
```

## Complexity Summary

| Algorithm | Time | Space | Use Case |
|---|---|---|---|
| BFS | $O(V + E)$ | $O(V)$ | Unweighted shortest paths |
| DFS | $O(V + E)$ | $O(V)$ | Cycle detection, topological sort, SCCs |
| Dijkstra | $O((V+E) \log V)$ | $O(V)$ | Non-negative weighted shortest paths |
| Bellman-Ford | $O(VE)$ | $O(V)$ | Negative weights, cycle detection |
| Floyd-Warshall | $O(V^3)$ | $O(V^2)$ | All-pairs shortest paths |
| Kruskal | $O(E \log E)$ | $O(V)$ | Minimum spanning tree (sparse) |
| Prim | $O((V+E) \log V)$ | $O(V)$ | Minimum spanning tree (dense) |
| Topological Sort | $O(V + E)$ | $O(V)$ | DAG ordering, dependency resolution |
| Kosaraju (SCC) | $O(V + E)$ | $O(V)$ | Strongly connected components |

## Further Reading

- *Introduction to Algorithms* (CLRS), Chapters 22–26
- *Algorithm Design* by Kleinberg & Tardos
- *The Algorithm Design Manual* by Skiena

Every algorithm in this post runs on the same `Graph` class. Copy the code, compose the pieces, and build something.
