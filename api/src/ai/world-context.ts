interface WorldContext {
  truths?: { name: string; description: string }[];
  assumptions?: string;
}

export function appendWorldContextLines(parts: string[], worldContext?: WorldContext): void {
  if (!worldContext) return;
  if (worldContext.truths?.length) {
    parts.push('', 'Setting truths for this world:');
    worldContext.truths.forEach((t) => parts.push(`- ${t.name}: ${t.description}`));
  }
  if (worldContext.assumptions) {
    parts.push('', 'World assumptions:', worldContext.assumptions);
  }
}
