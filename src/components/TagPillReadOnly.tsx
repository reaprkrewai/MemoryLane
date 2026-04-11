interface TagPillReadOnlyProps {
  tag: { id: string; name: string; color: string };
}

export function TagPillReadOnly({ tag }: TagPillReadOnlyProps) {
  return (
    <span
      className="inline-flex items-center rounded-full border px-3 py-[4px] text-label"
      style={{
        backgroundColor: `color-mix(in srgb, ${tag.color} 15%, transparent)`,
        borderColor: `color-mix(in srgb, ${tag.color} 40%, transparent)`,
        color: "var(--color-text)",
      }}
    >
      {tag.name}
    </span>
  );
}
