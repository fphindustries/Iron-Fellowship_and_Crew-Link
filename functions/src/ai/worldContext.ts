import { WorldContext } from "./_ai.type";

/**
 * Appends world truths and assumptions lines to a prompt parts array.
 * Call this before joining with "\n" to inject world context into any prompt.
 */
export function appendWorldContextLines(
  parts: string[],
  worldContext?: WorldContext
): void {
  if (!worldContext) return;
  if (worldContext.truths?.length) {
    parts.push("", "Setting truths for this world:");
    worldContext.truths.forEach((t) =>
      parts.push(`- ${t.name}: ${t.description}`)
    );
  }
  if (worldContext.assumptions) {
    parts.push("", "World assumptions:", worldContext.assumptions);
  }
}
