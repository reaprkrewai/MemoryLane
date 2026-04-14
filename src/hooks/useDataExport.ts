import { getDb } from "../lib/db";
import { useUiStore } from "../stores/uiStore";

export interface PhotoExport {
  id: string;
  entryId: string;
  fileName: string;
  mimeType: string;
  dataUri: string; // base64 data URI for photos stored as data
}

export interface ExportData {
  timestamp: string;
  version: string;
  entries: Array<{
    id: string;
    content: string;
    mood: string | null;
    wordCount: number;
    charCount: number;
    createdAt: number;
    updatedAt: number;
  }>;
  tags: Array<{
    id: string;
    name: string;
    color: string;
    createdAt: number;
  }>;
  entryTags: Array<{
    entryId: string;
    tagId: string;
  }>;
  photos: PhotoExport[];
  settings: {
    theme: string;
    fontSize: string;
  };
}

export function useDataExport() {
  const theme = useUiStore((s) => s.theme);
  const fontSize = useUiStore((s) => s.fontSize);

  const collect = async (): Promise<ExportData> => {
    const db = await getDb();

    // Fetch all entries
    const entries = await db.select<any[]>(
      "SELECT id, content, mood, word_count, char_count, created_at, updated_at FROM entries WHERE is_deleted = 0 ORDER BY created_at DESC"
    );

    // Fetch all tags
    const tags = await db.select<any[]>(
      "SELECT id, name, color, created_at FROM tags ORDER BY created_at ASC"
    );

    // Fetch entry-tag relationships
    const entryTags = await db.select<any[]>(
      "SELECT entry_id, tag_id FROM entry_tags ORDER BY entry_id ASC"
    );

    // Fetch all photos
    let photos: PhotoExport[] = [];
    try {
      const mediaRecords = await db.select<any[]>(
        "SELECT id, entry_id, photo_path, mime_type FROM media_attachments ORDER BY entry_id ASC, display_order ASC"
      );

      photos = mediaRecords.map((m) => ({
        id: m.id,
        entryId: m.entry_id,
        fileName: `photo-${m.id}.jpg`,
        mimeType: m.mime_type,
        dataUri: m.photo_path, // Already stored as data URI in DB
      }));
    } catch {
      // media_attachments table might not exist if 05-02 hasn't been fully initialized
      // Gracefully degrade
      photos = [];
    }

    return {
      timestamp: new Date().toISOString(),
      version: "1.0",
      entries: entries.map((e) => ({
        id: e.id,
        content: e.content,
        mood: e.mood,
        wordCount: e.word_count,
        charCount: e.char_count,
        createdAt: e.created_at,
        updatedAt: e.updated_at,
      })),
      tags: tags.map((t) => ({
        id: t.id,
        name: t.name,
        color: t.color,
        createdAt: t.created_at,
      })),
      entryTags: entryTags.map((et) => ({
        entryId: et.entry_id,
        tagId: et.tag_id,
      })),
      photos,
      settings: {
        theme,
        fontSize,
      },
    };
  };

  return { collect };
}
