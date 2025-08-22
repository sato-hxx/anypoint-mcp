class TrieNode<T> {
  children: Map<string, TrieNode<T>> = new Map();
  isEndOfPattern: boolean = false;
  value: T | null = null;
}

/**
 * PathTrie is a trie data structure that stores paths and their corresponding patterns.
 * It is used to match paths to patterns.
 * 
 * @example
 * const trie = new PathTrie();
 * trie.insert("/amc/application-manager/api/v2/organizations/＊/environments/＊/deployments/＊/specs/AAA/logs");  
 * trie.search("/amc/application-manager/api/v2/organizations/111/environments/222/deployments/333/specs/AAA/logs");
 * // → { value: '111', captures: [ '111', '222', '333' ] }
 * 
 * trie.search("/amc/application-manager/api/v2/organizations/999/environments/888/deployments/777/specs/BBB/logs");
 * // → null
 * 
 * @remarks
 * ## Concurrency Considerations
 * This class is NOT thread-safe.
 * 
 * When used in multi-threaded environments such as Node.js Worker Threads, 
 * if the same instance is accessed concurrently, explicit synchronization 
 * mechanisms (e.g., Mutex) must be introduced to maintain consistency.
 * 
 * In typical Node.js single-threaded environments, 
 * this is not an issue since each process holds its own independent instance.
 */
class PathTrie<T> {
  private root: TrieNode<T>;

  private delimiter: string;

  constructor(delimiter: string = '/') {
    this.root = new TrieNode<T>();
    this.delimiter = delimiter;
  }

  insert(pattern: string, value: T) {
    const segments = pattern.split(this.delimiter).filter(Boolean);
    let node = this.root;

    for (const seg of segments) {
      if (!node.children.has(seg)) {
        node.children.set(seg, new TrieNode<T>());
      }
      node = node.children.get(seg)!;
    }
    node.isEndOfPattern = true;
    node.value = value;
  }

  search(path: string): { value: T; captures: string[] } | null {
    const segments = path.split(this.delimiter).filter(Boolean);
    return this.searchHelper(this.root, segments, 0, []);
  }

  private searchHelper(node: TrieNode<T>, segments: string[], index: number, captures: string[]): { value: T; captures: string[] } | null {
    if (index === segments.length) {
      if (node.isEndOfPattern && node.value !== null) {
        return { value: node.value, captures };
      }
      return null;
    }

    const seg = segments[index];
    if (seg === undefined) {
      return null;
    }

    // Exact match優先
    if (node.children.has(seg)) {
      const res = this.searchHelper(node.children.get(seg)!, segments, index + 1, captures);
      if (res !== null) {
        return res;
      }
    }

    // ワイルドカードマッチ
    if (node.children.has('*')) {
      const res = this.searchHelper(node.children.get('*')!, segments, index + 1, [...captures, seg]);
      if (res !== null) {
        return res;
      }
    }

    return null;
  }
}

export { PathTrie };