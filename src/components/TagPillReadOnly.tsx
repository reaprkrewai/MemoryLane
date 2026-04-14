interface TagPillReadOnlyProps {
  tag: { id: string; name: string; color: string };
}

export function TagPillReadOnly({ tag }: TagPillReadOnlyProps) {
  return (
    <span
      className="inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-medium"
      style={{
        backgroundColor: `color-mix(in srgb, ${tag.color} 12%, transparent)`,
        borderColor: `color-mix(in srgb, ${tag.color} 35%, transparent)`,
        color: "var(--color-text)",
      }}
    >
      {tag.name}
    </span>
  );
}
