import { createHash } from "node:crypto";

interface RingPoint {
  hash: bigint;
  nodeId: string;
}

function hashValue(value: string): bigint {
  const digest = createHash("sha256").update(value).digest("hex").slice(0, 16);
  return BigInt(`0x${digest}`);
}

export class ConsistentHashRing {
  private points: RingPoint[] = [];

  constructor(nodeIds: string[], virtualNodeCount = 128) {
    for (const nodeId of nodeIds) {
      for (let index = 0; index < virtualNodeCount; index += 1) {
        this.points.push({ hash: hashValue(`${nodeId}#${index}`), nodeId });
      }
    }
    this.points.sort((a, b) => (a.hash < b.hash ? -1 : a.hash > b.hash ? 1 : 0));
  }

  getNode(key: string): string {
    if (this.points.length === 0) throw new Error("Consistent hash ring has no nodes");
    const keyHash = hashValue(key);
    let low = 0;
    let high = this.points.length;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      const point = this.points[middle];
      if (point && point.hash < keyHash) low = middle + 1;
      else high = middle;
    }
    return this.points[low % this.points.length]!.nodeId;
  }
}
