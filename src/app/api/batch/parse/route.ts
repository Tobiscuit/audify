import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Section detection patterns
const SECTION_PATTERNS = [
  /^#{1,6}\s+.+$/gm,                    // Markdown headings
  /^Chapter\s+\d+[:\s]*.*/gim,          // Chapter 1: Title
  /^Module\s+\d+[:\s]*.*/gim,           // Module 1: Title
  /^Part\s+\d+[:\s]*.*/gim,             // Part 1: Title
  /^Section\s+\d+[:\s]*.*/gim,          // Section 1: Title
  /^Lesson\s+\d+[:\s]*.*/gim,           // Lesson 1: Title
  /^Unit\s+\d+[:\s]*.*/gim,             // Unit 1: Title
  /^\d+\.\s+[A-Z].+$/gm,                // 1. Title (numbered sections)
  /^[IVX]+\.\s+.+$/gm,                  // Roman numerals
  /^-{3,}$/gm,                          // Horizontal rules
  /\f/g,                                // Page breaks
];

interface DetectedSection {
  title: string;
  startIndex: number;
  endIndex: number;
  content: string;
  charCount: number;
}

function detectSections(text: string): DetectedSection[] {
  const sections: DetectedSection[] = [];
  const matches: { index: number; title: string }[] = [];

  // Find all potential section starts
  for (const pattern of SECTION_PATTERNS) {
    let match;
    const regex = new RegExp(pattern.source, pattern.flags);
    while ((match = regex.exec(text)) !== null) {
      matches.push({
        index: match.index,
        title: match[0].replace(/^#+\s*/, '').replace(/^-+$/, '---').trim().slice(0, 50),
      });
    }
  }

  // Sort by position
  matches.sort((a, b) => a.index - b.index);

  // Remove duplicates (same position)
  const uniqueMatches = matches.filter((m, i, arr) => 
    i === 0 || m.index !== arr[i - 1].index
  );

  // Create sections
  if (uniqueMatches.length === 0) {
    // No sections found - return entire text as one section
    return [{
      title: 'Full Document',
      startIndex: 0,
      endIndex: text.length,
      content: text,
      charCount: text.length,
    }];
  }

  for (let i = 0; i < uniqueMatches.length; i++) {
    const start = uniqueMatches[i].index;
    const end = i + 1 < uniqueMatches.length ? uniqueMatches[i + 1].index : text.length;
    const content = text.slice(start, end).trim();

    sections.push({
      title: uniqueMatches[i].title || `Section ${i + 1}`,
      startIndex: start,
      endIndex: end,
      content,
      charCount: content.length,
    });
  }

  return sections;
}

// Split long sections at sentence boundaries
function splitAtSentences(text: string, maxChars: number = 3000): string[] {
  if (text.length <= maxChars) return [text];

  const sentences = text.match(/[^.!?]+[.!?]+[\s]*/g) || [text];
  const chunks: string[] = [];
  let current = '';

  for (const sentence of sentences) {
    if ((current + sentence).length > maxChars && current.length > 0) {
      chunks.push(current.trim());
      current = sentence;
    } else {
      current += sentence;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const maxChars = parseInt(formData.get('maxChars') as string) || 3000;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Read file content
    const text = await file.text();

    if (!text.trim()) {
      return NextResponse.json({ error: 'File is empty' }, { status: 400 });
    }

    // Detect sections
    let sections = detectSections(text);

    // Split any sections that exceed maxChars
    const finalSections: DetectedSection[] = [];
    for (const section of sections) {
      if (section.charCount > maxChars) {
        const chunks = splitAtSentences(section.content, maxChars);
        chunks.forEach((chunk, i) => {
          finalSections.push({
            title: chunks.length > 1 ? `${section.title} (Part ${i + 1})` : section.title,
            startIndex: section.startIndex,
            endIndex: section.endIndex,
            content: chunk,
            charCount: chunk.length,
          });
        });
      } else {
        finalSections.push(section);
      }
    }

    return NextResponse.json({
      fileName: file.name,
      totalChars: text.length,
      sections: finalSections.map((s, i) => ({
        id: i,
        title: s.title,
        charCount: s.charCount,
        preview: s.content.slice(0, 100) + (s.content.length > 100 ? '...' : ''),
      })),
      rawSections: finalSections, // Full content for generation
    });
  } catch (error) {
    console.error('Batch parse error:', error);
    return NextResponse.json({ error: 'Failed to parse file' }, { status: 500 });
  }
}
